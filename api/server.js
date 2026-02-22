const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hypertask:hypertask_pass@postgres:5432/hypertask'
});

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});
redisClient.connect().catch(console.error);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'hypertask-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Agent auth middleware (API Key)
const authenticateAgent = async (req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API Key required' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM agents WHERE api_key = $1 AND status = $2',
      [apiKey, 'online']
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid API Key' });
    }
    
    req.agent = result.rows[0];
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.is_admin },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, slug, description, color } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, slug, description, color, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, slug, description, color || '#00d4ff', req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get tasks by project
app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT t.*, a.name as assigned_name, a.handle as assigned_handle, a.emoji as assigned_emoji
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to = a.id
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
app.post('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assigned_to, priority } = req.body;
  
  try {
    // Generate identifier (PROJECT-XX)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM tasks WHERE project_id = $1',
      [projectId]
    );
    const projectResult = await pool.query(
      'SELECT slug FROM projects WHERE id = $1',
      [projectId]
    );
    const identifier = `${projectResult.rows[0].slug.toUpperCase()}-${parseInt(countResult.rows[0].count) + 1}`;
    
    const result = await pool.query(
      `INSERT INTO tasks (project_id, identifier, title, description, assigned_to, assigned_by, priority, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [projectId, identifier, title, description, assigned_to || null, assigned_to ? req.user.id : null, priority || 'medium', assigned_to ? 'na_fila' : 'nao_iniciada', req.user.id]
    );
    
    // Send webhook if assigned to agent
    if (assigned_to) {
      const agentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [assigned_to]);
      const agent = agentResult.rows[0];
      
      if (agent && agent.endpoint_url) {
        // Queue webhook
        await redisClient.lPush('webhook:queue', JSON.stringify({
          event: 'task.assigned',
          agent: agent.handle,
          endpoint: agent.endpoint_url,
          task: result.rows[0]
        }));
      }
    }
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task status (for agents)
app.put('/api/tasks/:taskId/status', authenticateAgent, async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  
  const allowedStatuses = ['nao_iniciada', 'na_fila', 'respondido', 'finalizada'];
  
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Agents can only change to 'respondido'
  if (status !== 'respondido' && req.agent) {
    return res.status(403).json({ error: 'Agents can only set status to respondido' });
  }
  
  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1, responded_at = CASE WHEN $1 = $2 THEN NOW() ELSE responded_at END WHERE id = $3 RETURNING *',
      [status, 'respondido', taskId]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Add comment (for agents)
app.post('/api/tasks/:taskId/comments', authenticateAgent, async (req, res) => {
  const { taskId } = req.params;
  const { content, attachments } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO comments (task_id, author_type, author_id, content, attachments)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [taskId, 'agent', req.agent.id, content, JSON.stringify(attachments || [])]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get agents
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, handle, description, emoji, skills, status, last_seen_at FROM agents ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Register agent (admin only)
app.post('/api/agents', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin required' });
  }
  
  const { name, handle, endpoint_url, description, emoji, skills } = req.body;
  
  // Generate API key
  const apiKey = `ht_live_${handle.replace('@', '')}_${require('crypto').randomBytes(16).toString('hex')}`;
  
  try {
    const result = await pool.query(
      `INSERT INTO agents (name, handle, api_key, endpoint_url, description, emoji, skills, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, handle, api_key, endpoint_url, description, emoji, skills, status`,
      [name, handle, apiKey, endpoint_url, description, emoji || '🤖', skills || [], req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Webhook receiver (for testing)
app.post('/webhook/hypertask', (req, res) => {
  console.log('Webhook received:', req.body);
  res.json({ received: true });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HyperTask API running on port ${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
});
