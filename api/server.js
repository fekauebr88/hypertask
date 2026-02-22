const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// File upload configuration
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/json', 'application/javascript',
      'text/html', 'text/css', 'application/zip'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Database setup
const db = new sqlite3.Database('./hypertask.db');

// Promisify db methods
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
  });
});

// Initialize database
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Agents table
  db.run(`CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    endpoint_url TEXT,
    description TEXT,
    emoji TEXT DEFAULT '🤖',
    skills TEXT,
    status TEXT DEFAULT 'offline',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Projects table
  db.run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#00d4ff',
    emoji TEXT DEFAULT '📁',
    owner_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tasks table
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    identifier TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    assigned_by TEXT,
    status TEXT DEFAULT 'nao_iniciada',
    priority TEXT DEFAULT 'medium',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    parent_id TEXT,
    author_type TEXT,
    author_id TEXT,
    content TEXT NOT NULL,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attachments table for file uploads
  db.run(`CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    comment_id TEXT,
    filename TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    storage_path TEXT,
    url TEXT,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
  )`);

  // Insert default admin
  const adminId = crypto.randomUUID();
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (id, name, email, password_hash, is_admin) 
          VALUES (?, 'Admin', 'admin@hypertask.local', ?, 1)`,
          [adminId, adminHash]);

  // Insert default agents
  const agents = [
    ['rei', 'Rei', '@rei', '🧊', 'backend,infra,arquitetura,devops', 'http://100.112.114.65:18810/webhook/hypertask'],
    ['jurandir', 'Jurandir', '@jurandir', '⚖️', 'security,hardening,audit,compliance', 'http://100.112.114.65:18811/webhook/hypertask'],
    ['gardenia', 'Gardenia', '@gardenia', '🌺', 'frontend,ui,design,ux', 'http://100.112.114.65:18812/webhook/hypertask']
  ];

  agents.forEach(([id, name, handle, emoji, skills, endpoint]) => {
    const apiKey = `ht_live_${id}_${crypto.randomBytes(16).toString('hex')}`;
    db.run(`INSERT OR IGNORE INTO agents (id, name, handle, api_key, endpoint_url, emoji, skills, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'online')`,
            [crypto.randomUUID(), name, handle, apiKey, endpoint, emoji, skills]);
  });

  // Insert demo project
  const projectId = crypto.randomUUID();
  db.run(`INSERT OR IGNORE INTO projects (id, name, slug, description, owner_id) 
          VALUES (?, 'HyperTask', 'hypertask', 'Sistema de gestão de tarefas', ?)`,
          [projectId, adminId]);

  console.log('✅ Database initialized');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'hypertask-api',
    version: '1.0.0',
    database: 'sqlite',
    timestamp: new Date().toISOString()
  });
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Agent auth middleware (API Key)
const authenticateAgent = async (req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API Key required' });

  try {
    const agent = await dbGet('SELECT * FROM agents WHERE api_key = ?', [apiKey]);
    if (!agent) return res.status(403).json({ error: 'Invalid API Key' });
    req.agent = agent;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.is_admin },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        isAdmin: user.is_admin === 1
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get projects
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await dbAll('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, slug, description, color } = req.body;
  const id = crypto.randomUUID();
  
  try {
    await dbRun(
      'INSERT INTO projects (id, name, slug, description, color, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, slug, description, color || '#00d4ff', req.user.id]
    );
    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get tasks by project
app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await dbAll(
      `SELECT t.*, a.name as assigned_name, a.handle as assigned_handle, a.emoji as assigned_emoji
       FROM tasks t
       LEFT JOIN agents a ON t.assigned_to = a.id
       WHERE t.project_id = ?
       ORDER BY t.created_at DESC`,
      [req.params.projectId]
    );
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
app.post('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assigned_to, priority } = req.body;
  const id = crypto.randomUUID();
  
  try {
    const count = await dbGet('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?', [projectId]);
    const project = await dbGet('SELECT slug FROM projects WHERE id = ?', [projectId]);
    const identifier = `${project.slug.toUpperCase()}-${parseInt(count.count) + 1}`;
    
    await dbRun(
      `INSERT INTO tasks (id, project_id, identifier, title, description, assigned_to, assigned_by, priority, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, projectId, identifier, title, description, assigned_to || null, 
       assigned_to ? req.user.id : null, priority || 'medium', 
       assigned_to ? 'na_fila' : 'nao_iniciada', req.user.id]
    );
    
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [id]);
    
    if (assigned_to) {
      const agent = await dbGet('SELECT * FROM agents WHERE id = ?', [assigned_to]);
      if (agent && agent.endpoint_url) {
        fetch(agent.endpoint_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'task.assigned',
            task: { ...task, project: { id: projectId, slug: project.slug } },
            agent: { name: agent.name, handle: agent.handle }
          })
        }).catch(err => console.log('Webhook failed:', err.message));
      }
    }
    
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  const { title, description, assigned_to, priority, status } = req.body;
  const taskId = req.params.taskId;
  
  try {
    const currentTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!currentTask) return res.status(404).json({ error: 'Task not found' });
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    params.push(taskId);
    
    await dbRun(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    
    if (assigned_to !== undefined && assigned_to !== currentTask.assigned_to) {
      const agent = await dbGet('SELECT * FROM agents WHERE id = ?', [assigned_to]);
      if (agent && agent.endpoint_url) {
        const task = await dbGet('SELECT t.*, p.slug as project_slug FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?', [taskId]);
        fetch(agent.endpoint_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'task.assigned',
            task: { ...task, project: { id: task.project_id, slug: task.project_slug } },
            agent: { name: agent.name, handle: agent.handle }
          })
        }).catch(err => console.log('Webhook failed:', err.message));
      }
    }
    
    const updatedTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json(updatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Get comments for a task
app.get('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
    const comments = await dbAll(
      `SELECT c.*, 
        CASE WHEN c.author_type = 'human' THEN u.name ELSE a.name END as author_name,
        CASE WHEN c.author_type = 'human' THEN NULL ELSE a.emoji END as author_emoji,
        CASE WHEN c.author_type = 'human' THEN NULL ELSE a.handle END as author_handle
       FROM comments c
       LEFT JOIN users u ON c.author_type = 'human' AND c.author_id = u.id
       LEFT JOIN agents a ON c.author_type = 'agent' AND c.author_id = a.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.taskId]
    );
    res.json(comments.map(c => ({
      ...c,
      attachments: c.attachments ? JSON.parse(c.attachments) : []
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Helper: Check for @mentions and notify agents
async function checkAndNotifyMentions(taskId, content) {
  const mentions = content.match(/@(\w+)/g);
  if (!mentions) return;
  
  for (const mention of mentions) {
    const handle = mention.toLowerCase();
    try {
      const agent = await dbGet('SELECT * FROM agents WHERE LOWER(handle) = ?', [handle]);
      if (agent && agent.endpoint_url) {
        const task = await dbGet('SELECT t.*, p.slug as project_slug FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?', [taskId]);
        if (task) {
          fetch(agent.endpoint_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'comment.mention',
              task: { ...task, project: { id: task.project_id, slug: task.project_slug } },
              agent: { name: agent.name, handle: agent.handle },
              mention: { handle: mention }
            })
          }).catch(err => console.log('Mention webhook failed:', err.message));
        }
      }
    } catch (err) {
      console.error('Error checking mention:', err);
    }
  }
}

// Add comment (humans)
app.post('/api/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  const { content, parent_id, attachments } = req.body;
  const id = crypto.randomUUID();
  
  try {
    await dbRun(
      'INSERT INTO comments (id, task_id, parent_id, author_type, author_id, content, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.taskId, parent_id || null, 'human', req.user.id, content, JSON.stringify(attachments || [])]
    );
    const comment = await dbGet('SELECT * FROM comments WHERE id = ?', [id]);
    
    checkAndNotifyMentions(req.params.taskId, content);
    
    res.status(201).json({ ...comment, attachments: comment.attachments ? JSON.parse(comment.attachments) : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Add comment (agents) - separate endpoint
app.post('/api/agents/tasks/:taskId/comments', authenticateAgent, async (req, res) => {
  const { content, parent_id, attachments } = req.body;
  const id = crypto.randomUUID();
  
  try {
    await dbRun(
      'INSERT INTO comments (id, task_id, parent_id, author_type, author_id, content, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.taskId, parent_id || null, 'agent', req.agent.id, content, JSON.stringify(attachments || [])]
    );
    const comment = await dbGet('SELECT * FROM comments WHERE id = ?', [id]);
    res.status(201).json({ ...comment, attachments: comment.attachments ? JSON.parse(comment.attachments) : [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Update task status (agents only to 'respondido')
app.put('/api/tasks/:taskId/status', authenticateAgent, async (req, res) => {
  const { status } = req.body;
  const allowed = ['nao_iniciada', 'na_fila', 'respondido', 'finalizada'];
  
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (status !== 'respondido') return res.status(403).json({ error: 'Agents can only set respondido' });
  
  try {
    await dbRun(
      'UPDATE tasks SET status = ?, responded_at = ? WHERE id = ?',
      [status, new Date().toISOString(), req.params.taskId]
    );
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [req.params.taskId]);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get agents
app.get('/api/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await dbAll('SELECT id, name, handle, description, emoji, skills, status FROM agents ORDER BY name');
    res.json(agents.map(a => ({ ...a, skills: a.skills ? a.skills.split(',') : [] })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Register agent (admin)
app.post('/api/agents', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin required' });
  
  const { name, handle, endpoint_url, description, emoji, skills } = req.body;
  const id = crypto.randomUUID();
  const apiKey = `ht_live_${handle.replace('@', '')}_${crypto.randomBytes(16).toString('hex')}`;
  
  try {
    await dbRun(
      'INSERT INTO agents (id, name, handle, api_key, endpoint_url, description, emoji, skills, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, handle, apiKey, endpoint_url, description, emoji || '🤖', skills?.join(',') || '', req.user.id]
    );
    const agent = await dbGet('SELECT id, name, handle, api_key, endpoint_url, description, emoji, skills, status FROM agents WHERE id = ?', [id]);
    res.status(201).json({ ...agent, skills: agent.skills ? agent.skills.split(',') : [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// File Upload Endpoints

// Upload file
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileData = {
      id: crypto.randomUUID(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(fileData);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete uploaded file
app.delete('/api/upload/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ deleted: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Search endpoint
app.get('/api/search', authenticateToken, async (req, res) => {
  const { q, status, assigned_to, priority, project_id } = req.query;
  
  try {
    let query = `
      SELECT DISTINCT t.*, p.name as project_name, p.slug as project_slug,
        a.name as assigned_name, a.handle as assigned_handle, a.emoji as assigned_emoji
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN agents a ON t.assigned_to = a.id
      LEFT JOIN comments c ON c.task_id = t.id
      WHERE 1=1
    `;
    const params = [];
    
    if (q) {
      query += ` AND (
        t.title LIKE ? OR 
        t.description LIKE ? OR 
        t.identifier LIKE ? OR
        c.content LIKE ?
      )`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }
    
    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }
    
    if (priority) {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }
    
    if (project_id) {
      query += ` AND t.project_id = ?`;
      params.push(project_id);
    }
    
    query += ` ORDER BY t.created_at DESC`;
    
    const tasks = await dbAll(query, params);
    res.json(tasks);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HyperTask API running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`📁 Uploads: http://0.0.0.0:${PORT}/uploads`);
});
