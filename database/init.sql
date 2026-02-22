-- HyperTask Database Schema
-- PostgreSQL 15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users (Humanos)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: agents (OpenClaws cadastrados)
-- ============================================
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    handle VARCHAR(50) UNIQUE NOT NULL, -- @rei, @jurandir
    api_key VARCHAR(255) UNIQUE NOT NULL,
    endpoint_url TEXT NOT NULL,
    description TEXT,
    emoji VARCHAR(10) DEFAULT '🤖',
    skills TEXT[] DEFAULT '{}',
    allowed_projects UUID[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'offline', -- online, offline
    last_seen_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: projects
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#00d4ff',
    emoji VARCHAR(10) DEFAULT '📁',
    settings JSONB DEFAULT '{}',
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: tasks (Tarefas)
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    identifier VARCHAR(20) UNIQUE NOT NULL, -- PROJ-42
    title VARCHAR(500) NOT NULL,
    description TEXT,
    description_html TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES agents(id),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    
    -- Status: nao_iniciada, na_fila, respondido, finalizada
    status VARCHAR(20) DEFAULT 'nao_iniciada',
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Datas
    due_date DATE,
    responded_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadados
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_identifier ON tasks(identifier);

-- ============================================
-- TABELA: comments (Comentários com threading)
-- ============================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- Threading
    
    -- Autor (humano ou agent)
    author_type VARCHAR(20) CHECK (author_type IN ('human', 'agent')),
    author_id UUID, -- Pode ser user.id ou agent.id
    
    content TEXT NOT NULL,
    content_html TEXT,
    
    -- Anexos (JSON array)
    attachments JSONB DEFAULT '[]',
    
    is_system BOOLEAN DEFAULT false, -- Comentários automáticos
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- ============================================
-- TABELA: attachments (Anexos)
-- ============================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    storage_path TEXT NOT NULL, -- Path no MinIO
    uploaded_by UUID, -- user.id ou agent.id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: activities (Audit trail)
-- ============================================
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    actor_type VARCHAR(20), -- human ou agent
    actor_id UUID,
    action VARCHAR(50) NOT NULL, -- status_changed, comment_added, assigned
    field VARCHAR(50), -- Qual campo mudou
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_task ON activities(task_id);

-- ============================================
-- TABELA: labels
-- ============================================
CREATE TABLE labels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#666666',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);

-- ============================================
-- TABELA: task_labels (N:M)
-- ============================================
CREATE TABLE task_labels (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Usuário admin inicial
INSERT INTO users (name, email, password_hash, is_admin) VALUES
('Admin', 'admin@hypertask.local', '$2b$10$...', true);

-- Agents iniciais (API keys serão geradas pela aplicação)
INSERT INTO agents (name, handle, api_key, endpoint_url, description, emoji, skills) VALUES
('Rei', '@rei', 'ht_live_rei_placeholder', 'http://100.112.114.65:18796/webhook/hypertask', 'Arquiteta de Sistemas Completa', '🧊', ARRAY['backend', 'infra', 'arquitetura', 'devops']),
('Jurandir', '@jurandir', 'ht_live_jurandir_placeholder', 'http://100.112.114.65:18792/webhook/hypertask', 'Especialista em Segurança', '⚖️', ARRAY['security', 'hardening', 'audit', 'compliance']),
('Gardenia', '@gardenia', 'ht_live_gardenia_placeholder', 'http://100.112.114.65:18794/webhook/hypertask', 'Especialista em Frontend e Design', '🌺', ARRAY['frontend', 'ui', 'design', 'ux']);
