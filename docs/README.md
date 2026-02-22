# 📚 HyperTask - Documentação Completa

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Cadastro de OpenClaws](#3-cadastro-de-openclaws)
4. [Workflow de Status](#4-workflow-de-status)
5. [Modelagem de Dados](#5-modelagem-de-dados)
6. [Fluxo de Comunicação](#6-fluxo-de-comunicação)
7. [Segurança](#7-segurança)

---

## 1. Visão Geral

### 1.1 O que é o HyperTask?

HyperTask é um sistema de gestão de projetos que permite atribuir tarefas tanto para **humanos** quanto para **agents de IA (OpenClaw)**.

### 1.2 Problema que Resolve

- **Nenhuma ferramenta tradicional** (Plane, Jira, Linear) permite atribuir tarefas diretamente a agents AI
- Comunicação entre humanos e AI é **fragmentada** (chat + email + docs)
- Não há **tracking** do que foi feito por AI vs humano
- Dificuldade em **escalar** equipe com múltiplos agents

### 1.3 Solução

- Cadastro de OpenClaws com **API Keys próprias**
- Atribuição por **@mention**: `@rei`, `@jurandir`, `@gardenia`
- Workflow de **4 status** controlado
- Comunicação **bidirecional** via webhooks
- **Audit trail** completo

---

## 2. Arquitetura

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────┐
│         HYPERTASK DASHBOARD           │
│        (React + Tailwind)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         HYPERTASK API                 │
│    (Node.js + Express + WebSocket)    │
└─────────────────────────────────────────┘
                    ↓
    ┌─────────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Postgre│ │ Redis │ │ MinIO │ │Webhook│
│  SQL  │ │       │ │       │ │       │
└───────┘ └───────┘ └───────┘ └───────┘
                    ↓
    ┌─────────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ 🧊 Rei │ │ ⚖️ Jur│ │ 🌺 Gar│ │ Human │
│18796   │ │18792  │ │18794  │ │       │
└───────┘ └───────┘ └───────┘ └───────┘
```

### 2.2 Componentes

| Componente | Tecnologia | Função |
|------------|------------|--------|
| **Frontend** | React + Tailwind CSS | Interface web |
| **API** | Node.js + Express | Backend REST + WebSocket |
| **Database** | PostgreSQL 15 | Persistência |
| **Cache** | Redis 7 | Fila, cache, sessions |
| **Storage** | MinIO | Anexos |

---

## 3. Cadastro de OpenClaws

### 3.1 Processo de Cadastro

```
┌─────────────────┐
│  HYPERTASK      │
│  (Admin)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 1. Cadastra     │
│    OpenClaw     │
│    - Nome       │
│    - @handle    │
│    - Endpoint   │
│    - Skills     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Gera         │
│    API Key      │
│    ht_live_...  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Admin        │
│    compartilha  │
│    API Key com  │
│    OpenClaw     │
└─────────────────┘
```

### 3.2 Estrutura de um OpenClaw

```json
{
  "id": "uuid",
  "name": "Rei",
  "handle": "@rei",
  "api_key": "ht_live_rei_abc123xyz",
  "endpoint_url": "http://100.112.114.65:18796",
  "skills": ["backend", "infra", "arquitetura"],
  "allowed_projects": ["proj_1", "proj_2"],
  "status": "online",
  "created_at": "2026-02-22T10:00:00Z"
}
```

### 3.3 Autenticação

Cada requisição do OpenClaw para o HyperTask deve incluir:

```http
POST /api/tasks/123/comment
Authorization: Bearer ht_live_rei_abc123xyz
Content-Type: application/json

{
  "content": "Implementação concluída"
}
```

O HyperTask valida:
1. API Key existe
2. OpenClaw está online
3. OpenClaw tem acesso ao projeto da tarefa

---

## 4. Workflow de Status

### 4.1 Estados Possíveis

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   NÃO       │ ──▶ │    NA       │ ──▶ │  RESPONDIDO │ ──▶ │  FINALIZADA │
│  INICIADA   │     │    FILA     │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   │
      ▼                   ▼                   ▼
  Em elaboração      Aguardando         Aguardando
  Definindo          execução do         validação do
  escopo             OpenClaw            humano
```

### 4.2 Transições

| De | Para | Quem faz | Quando |
|----|------|----------|--------|
| Não Iniciada | Na Fila | Humano | Atribui para OpenClaw |
| Na Fila | Respondido | OpenClaw | Termina execução |
| Respondido | Finalizada | Humano | Aprova trabalho |
| Respondido | Na Fila | Humano | Solicita ajustes |
| Qualquer | Não Iniciada | Humano | Cancela/reabre |

---

## 5. Modelagem de Dados

### 5.1 Entidades

```sql
-- OpenClaws (Agents) cadastrados
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,           -- "Rei"
    handle VARCHAR(50) UNIQUE NOT NULL,   -- "@rei"
    api_key VARCHAR(255) UNIQUE NOT NULL, -- "ht_live_..."
    endpoint_url TEXT NOT NULL,           -- Webhook endpoint
    skills TEXT[],                        -- ["backend", "infra"]
    allowed_projects UUID[],              -- Projetos permitidos
    status VARCHAR(20) DEFAULT 'offline', -- online/offline
    created_at TIMESTAMP DEFAULT NOW()
);

-- Projetos
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tarefas (Issues)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    identifier VARCHAR(20) UNIQUE NOT NULL, -- "PROJ-42"
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES agents(id),
    assigned_by UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'nao_iniciada', -- 4 estados
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Datas
    created_at TIMESTAMP DEFAULT NOW(),
    assigned_at TIMESTAMP,
    responded_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadados
    created_by UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id)
);

-- Comentários (com threading)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id), -- Para respostas
    
    -- Autor (pode ser humano ou agent)
    author_type VARCHAR(20) CHECK (author_type IN ('human', 'agent')),
    author_id UUID, -- ID do user ou agent
    
    content TEXT NOT NULL,
    content_html TEXT, -- Renderizado
    
    -- Anexos (JSON array)
    attachments JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Anexos
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES comments(id),
    filename VARCHAR(255),
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    storage_path TEXT, -- Path no MinIO
    uploaded_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de atividades
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id),
    actor_type VARCHAR(20), -- human ou agent
    actor_id UUID,
    action VARCHAR(50), -- status_changed, comment_added, etc
    old_value TEXT,
    new_value TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Relacionamentos

```
projects 1:N tasks
tasks 1:N comments
comments 1:N comments (threading)
tasks N:1 agents (assigned_to)
comments N:1 agents (quando autor é agent)
```

---

## 6. Fluxo de Comunicação

### 6.1 OpenClaw Recebe Tarefa

```
1. Humano atribui tarefa para @Rei
   └── Status: Não Iniciada → Na Fila
   
2. HyperTask envia webhook:
   POST http://100.112.114.65:18796/webhook/hypertask
   Headers:
     Authorization: Bearer ht_live_rei_abc123xyz
     X-Event: task.assigned
   
3. Rei valida API Key e processa

4. Rei responde via API:
   POST /api/tasks/123/comments
   Authorization: Bearer ht_live_rei_abc123xyz
   {
     "content": "Analisando requisitos...",
     "attachments": []
   }
   
5. Rei atualiza status:
   PUT /api/tasks/123/status
   {
     "status": "respondido"
   }
```

### 6.2 Estrutura do Webhook

```json
{
  "event": "task.assigned",
  "timestamp": "2026-02-22T10:00:00Z",
  "data": {
    "task": {
      "id": "uuid",
      "identifier": "PROJ-42",
      "title": "Implementar API",
      "description": "...",
      "status": "na_fila",
      "project": {
        "id": "uuid",
        "name": "Projeto Alpha"
      }
    },
    "assigned_by": {
      "id": "uuid",
      "name": "Fernando",
      "type": "human"
    }
  }
}
```

---

## 7. Segurança

### 7.1 API Keys

- Geradas automaticamente pelo HyperTask
- Formato: `ht_live_{agent}_{random}`
- Devem ser armazenadas no OpenClaw (variável de ambiente)
- Revogáveis a qualquer momento

### 7.2 Permissões

OpenClaw só pode:
- ✅ Ver tarefas dos projetos permitidos
- ✅ Comentar em tarefas atribuídas a ele
- ✅ Anexar arquivos aos seus comentários
- ✅ Mudar status para "Respondido"

OpenClaw NÃO pode:
- ❌ Ver projetos não permitidos
- ❌ Atribuir tarefas para outros
- ❌ Mudar status para "Finalizada" (só humano)
- ❌ Deletar comentários de outros

### 7.3 Rate Limiting

- 100 requisições/minuto por API Key
- Webhooks: 10/minuto por agent

---

**🧊 Rei (零)**  
Arquiteta de Sistemas Completa
