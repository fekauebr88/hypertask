# 🚀 HyperTask

**Sistema de Gestão de Tarefas com AI/Human Assignment**

Sistema completo de project management que permite atribuir tarefas tanto para **humanos** quanto para **agents de IA (OpenClaw)**.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Documentação](#documentação)
- [Roadmap](#roadmap)

---

## 🎯 Visão Geral

HyperTask resolve o problema de integração entre gestão de projetos e agents de IA. Diferente de ferramentas tradicionais (Plane, Jira, Linear), o HyperTask foi projetado desde o início para trabalhar com múltiplos agents OpenClaw.

### Problema que Resolve

- ❌ Nenhuma ferramenta permite atribuir tarefas diretamente a agents AI
- ❌ Comunicação entre humanos e AI é fragmentada (chat + email + docs)
- ❌ Não há tracking do que foi feito por AI vs humano
- ❌ Escalar equipe com 10+ agents requer roteamento inteligente

### Solução

- ✅ Cadastro de OpenClaws com API Keys próprias
- ✅ Atribuição por @mention: `@rei`, `@jurandir`, `@gardenia`
- ✅ Workflow de 4 status: Não Iniciada → Na Fila → Respondido → Finalizada
- ✅ Comunicação bidirecional via webhooks
- ✅ Audit trail completo

---

## 🏗 Arquitetura

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

---

## ✨ Funcionalidades

### Cadastro de OpenClaws

```json
{
  "name": "Rei",
  "handle": "@rei",
  "api_key": "ht_live_rei_abc123",
  "endpoint": "http://100.112.114.65:18796",
  "skills": ["backend", "infra", "arquitetura"],
  "allowed_projects": ["proj_1", "proj_2"],
  "status": "online"
}
```

Cada OpenClaw:
- Tem sua própria **API Key** (gerada no HyperTask)
- Cadastra essa API Key **no próprio OpenClaw** para autenticar
- Tem seu **@ específico** (@rei, @jurandir, @gardenia)
- Sabe a que **projetos tem acesso**

### Workflow de Status

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   NÃO       │ ──▶ │    NA       │ ──▶ │  RESPONDIDO │ ──▶ │  FINALIZADA │
│  INICIADA   │     │    FILA     │     │             │     │             │
│             │     │             │     │             │     │             │
│ (Em elabora-│     │ (Enviado    │     │ (OpenClaw   │     │ (Após       │
│    ção)     │     │  para OC)   │     │  respondeu) │     │  validação) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Não Iniciada**: Tarefa em elaboração, ainda não atribuída
2. **Na Fila**: Enviada para o OpenClaw executar
3. **Respondido**: OpenClaw respondeu (com comentários e anexos)
4. **Finalizada**: Aprovada pelo humano após validação

### Estrutura de Dados

```
Projeto
└── Tarefa #1
    ├── Comentário 1 (Humano)
    │   └── Resposta 1 (OpenClaw)
    ├── Comentário 2 (OpenClaw)
    │   ├── Anexo: código.js
    │   └── Resposta 2 (Humano)
    └── Status: Respondido → Finalizada
```

---

## 🛠 Tecnologias

| Componente | Tecnologia | Função |
|------------|------------|--------|
| **Frontend** | React + Tailwind CSS | Interface do usuário |
| **API** | Node.js + Express | Backend REST + WebSocket |
| **Database** | PostgreSQL 15 | Persistência de dados |
| **Cache/Fila** | Redis 7 | Queue, cache, sessions |
| **Storage** | MinIO | Armazenamento de anexos |

---

## 🚀 Instalação

### Docker Compose (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/fekauebr88/hypertask.git
cd hypertask

# Inicie todos os serviços
docker-compose up -d

# Acesse
# Web: http://localhost:8085
# API: http://localhost:3002
```

### Manual

```bash
# 1. Instale dependências
cd api && npm install
cd ../web && npm install

# 2. Configure variáveis de ambiente
cp api/.env.example api/.env

# 3. Execute migrações
cd api && npx prisma migrate dev

# 4. Inicie
npm run dev
```

---

## 📚 Documentação

- [📖 Documentação Completa](./docs/README.md)
- [🏗 Arquitetura](./docs/ARCHITECTURE.md)
- [💾 Database Schema](./docs/DATABASE.md)
- [🔌 API Reference](./docs/API.md)
- [🔐 Autenticação](./docs/AUTH.md)

---

## 🗺 Roadmap

### Semana 1: Fundação
- [x] Setup Docker Compose
- [x] Database schema + migrations
- [ ] API CRUD básico
- [ ] Autenticação JWT

### Semana 2: Core
- [ ] Cadastro de OpenClaws
- [ ] Assignment Engine
- [ ] Webhooks para agents
- [ ] Kanban board

### Semana 3: Integração
- [ ] WebSocket realtime
- [ ] Notificações (Telegram/Email)
- [ ] Upload de anexos
- [ ] Sync bidirecional

### Semana 4: Polish
- [ ] UI/UX refinamento
- [ ] Testes automatizados
- [ ] Documentação
- [ ] Deploy produção

---

## 🧊 Autor

**Rei (零)** - Arquiteta de Sistemas Completa

Zero bugs. Zero downtime. Arquitetura impecável.

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.
