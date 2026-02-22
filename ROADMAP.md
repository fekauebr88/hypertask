# Plano de Desenvolvimento HyperTask
## Versão 1.0 → 2.0 Roadmap

**Data:** 22/02/2026  
**Autora:** Rei (零) 🧊  
**Status Atual:** MVP Funcional (67% completo)

---

## 📊 ESTADO ATUAL

### ✅ O que está FUNCIONANDO (70%)

| Categoria | Features | Status |
|-----------|----------|--------|
| **Core** | Autenticação JWT, Projetos, Tarefas (CRUD), Workflow 4 status | ✅ 100% |
| **Comentários** | Criar/Listar, Threading, @mention detection | ✅ 100% |
| **Agents** | 3 agents (@rei, @jurandir, @gardenia), respostas automáticas | ⚠️ 50% |
| **Busca** | Full-text search, filtros avançados | ✅ 100% |
| **Upload** | Backend (POST/DELETE), tabela attachments | 🟡 70% |
| **UI/UX** | Dashboard, modais, design cyberpunk | ✅ 90% |
| **Infra** | API Node.js, Web Python, 3 Agents Python, SQLite | ✅ 100% |

### ❌ PROBLEMAS CRÍTICOS IDENTIFICADOS

1. **Agents usam TEMPLATES, não IA real** 🔴 CRÍTICO
   - Respostas são if/else com strings fixas
   - Não há análise real do contexto
   - Exemplo: Toda tarefa com "api" no título recebe a MESMA resposta

2. **Falta Botão "Process" para AI Analysis** 🟡 MÉDIO
   - Requisito original não implementado
   - Usuário precisa poder solicitar análise manual

3. **GitHub Integration ausente** 🟡 MÉDIO
   - Commit button não existe
   - Não há link entre tarefas e PRs/commits

4. **Deploy URL Tracking não existe** 🟢 BAIXO
   - Campo para URL de deploy não implementado
   - Não há tracking de onde está rodando

5. **WebSocket/Realtime ausente** 🟢 BAIXO
   - Comentários não atualizam em tempo real
   - Precisa refresh para ver novas respostas

6. **Email Notifications não implementado** 🟢 BAIXO
   - Sem notificações por email
   - Usuário precisa acessar sistema para ver updates

---

## 🎯 ROADMAP DE DESENVOLVIMENTO

### FASE 1: Correção Crítica (IA Real nos Agents) 🔥
**Tempo estimado:** 3-4 dias  
**Prioridade:** MÁXIMA

#### 1.1 Integração com IA (Rei)
**Problema:** Agents respondem com templates fixos
**Solução:** Conectar agents à minha IA (Rei) ou OpenAI

**Opção A: Webhook direto para mim (RECOMENDADO)**
```
HyperTask → Webhook → Meu OpenClaw (18796)
    ↓
Eu processo com minha IA
    ↓
Respondo via API do HyperTask
```
**Vantagens:**
- Usa minha inteligência real
- Sem custo adicional (OpenAI API paga)
- Respostas contextualizadas
- Posso perguntar esclarecimentos

**Implementação:**
- [ ] Criar endpoint no meu OpenClaw para receber webhooks
- [ ] Modificar agents Python para encaminhar para mim
- [ ] Implementar lógica de resposta inteligente
- [ ] Testar fluxo completo

#### 1.2 Botão "Process" para Análise
**Requisito original:** Botão que dispara análise AI
**Implementação:**
- [ ] Adicionar botão "🧊 Processar com IA" na tarefa
- [ ] Criar endpoint POST /api/tasks/:id/process
- [ ] Webhook para agente com evento 'task.process'
- [ ] Agente analisa e responde com sugestões detalhadas

**Estimativa:** 1 dia

---

### FASE 2: Integrações (GitHub + Deploy) 🚀
**Tempo estimado:** 4-5 dias  
**Prioridade:** ALTA

#### 2.1 GitHub Integration
**Features:**
- [ ] Campo "Repositório GitHub" no projeto
- [ ] Campo "Branch" na tarefa
- [ ] Botão "🔗 Vincular PR" na tarefa
- [ ] Botão "📊 Ver Commits" 
- [ ] Webhook do GitHub → HyperTask (quando PR mergeado)

**APIs necessárias:**
- GitHub REST API (listar PRs, commits)
- GitHub Webhooks (receber eventos)

**Estimativa:** 2-3 dias

#### 2.2 Deploy URL Tracking
**Features:**
- [ ] Campo "Deploy URL" na tarefa
- [ ] Campo "Ambiente" (dev/staging/prod)
- [ ] Badge de status do deploy (online/offline)
- [ ] Health check automático do deploy

**Estimativa:** 1-2 dias

---

### FASE 3: Experiência do Usuário ⭐
**Tempo estimado:** 3-4 dias  
**Prioridade:** MÉDIA

#### 3.1 WebSocket Realtime
**Problema:** Precisa refresh para ver novos comentários
**Solução:** WebSocket para atualizações em tempo real

**Implementação:**
- [ ] Adicionar Socket.io ao backend Node.js
- [ ] Conectar frontend ao WebSocket
- [ ] Emitir eventos: new_comment, status_changed
- [ ] Atualizar UI automaticamente

**Estimativa:** 2 dias

#### 3.2 Email Notifications
**Features:**
- [ ] Configuração de SMTP (variáveis de ambiente)
- [ ] Templates de email (HTML/text)
- [ ] Triggers:
  - Tarefa atribuída a você
  - Sua tarefa foi respondida
  - Novo comentário em tarefa que você participa
- [ ] Preferências de notificação por usuário

**Estimativa:** 1-2 dias

#### 3.3 Upload de Arquivos (Frontend)
**Problema:** Backend pronto, falta UI
**Implementação:**
- [ ] Input de arquivo no formulário de comentários
- [ ] Preview de imagens antes de enviar
- [ ] Drag & drop de arquivos
- [ ] Lista de anexos com ícones por tipo
- [ ] Download de anexos

**Estimativa:** 1 dia

---

### FASE 4: Polish & Performance 🎨
**Tempo estimado:** 2-3 dias  
**Prioridade:** BAIXA

#### 4.1 Melhorias UI/UX
- [ ] Animações de transição
- [ ] Toast notifications (sucesso/erro)
- [ ] Loading states
- [ ] Empty states ilustrados
- [ ] Tema dark/light toggle

#### 4.2 Performance
- [ ] Paginação de tarefas (infinite scroll)
- [ ] Cache de dados no frontend
- [ ] Otimização de queries SQL
- [ ] Compressão de assets

#### 4.3 Testes
- [ ] Testes unitários (API)
- [ ] Testes de integração
- [ ] Testes E2E (criticau)

---

## 📅 CRONOGRAMA SUGERIDO

### Semana 1 (Dias 1-7)
| Dia | Tarefa | Responsável |
|-----|--------|-------------|
| 1-2 | FASE 1.1: Integrar IA nos agents | @rei |
| 3 | FASE 1.2: Botão "Process" | @rei |
| 4-5 | FASE 2.1: GitHub Integration | @rei |
| 6-7 | FASE 2.2: Deploy URL Tracking | @rei |

### Semana 2 (Dias 8-14)
| Dia | Tarefa | Responsável |
|-----|--------|-------------|
| 8-9 | FASE 3.1: WebSocket Realtime | @rei |
| 10-11 | FASE 3.2: Email Notifications | @rei |
| 12 | FASE 3.3: Upload Frontend | @rei |
| 13-14 | FASE 4: Polish & Performance | @rei |

**Total estimado:** 10-14 dias de trabalho full-time

---

## 🎯 PRÓXIMAS AÇÕES IMEDIATAS

### Para fazer AGORA (prioridade máxima):

1. **Escolher arquitetura de IA:**
   - [ ] Opção A: Conectar agents ao meu OpenClaw (recomendado)
   - [ ] Opção B: Integrar OpenAI API (precisa de OPENAI_API_KEY)
   - [ ] Opção C: Híbrido (agents chamam minha API interna)

2. **Decidir escopo do GitHub Integration:**
   - [ ] Apenas visualização (links)?
   - [ ] Criar branches/PRs do HyperTask?
   - [ ] Apenas receber webhooks do GitHub?

3. **Definir prioridades:**
   - Quer fazer TUDO ou focar no crítico (IA real) primeiro?
   - Tem deadline?
   - Tem orçamento para OpenAI API?

---

## 💡 RECOMENDAÇÃO

### MVP 2.0 (Mínimo Viável Melhorado):
Focar apenas em:
1. ✅ **IA Real nos Agents** (FASE 1.1) - CRÍTICO
2. ✅ **Botão Process** (FASE 1.2) - REQUISITO ORIGINAL
3. ✅ **Upload Frontend** (FASE 3.3) - RÁPIDO

**Tempo:** 4-5 dias  
**Resultado:** Sistema com IA real, funcionalidade completa de upload

### Full Release 2.0:
Todas as fases (1-4)  
**Tempo:** 2-3 semanas  
**Resultado:** Sistema enterprise completo

---

## 📞 PRÓXIMO PASSO

**Decisão necessária:**

Quer que eu implemente AGORA:
- [ ] **Apenas IA real nos agents** (corrigir o problema crítico)
- [ ] **MVP 2.0** (IA + Process button + Upload)
- [ ] **Full Release 2.0** (todas as features)

**Qual opção?** 💀
