#!/usr/bin/env python3
"""
HyperTask Agent Handler - Rei (@rei)
Porta: 18798
Especialidades: backend, infra, arquitetura, devops
"""

from fastapi import FastAPI, Request
import uvicorn
import httpx
import asyncio
from datetime import datetime

app = FastAPI(title="HyperTask Agent - Rei")

# Configuração
HYPERTASK_API = "http://100.112.114.65:3002"
AGENT_API_KEY = "ht_live_rei_abc123xyz_placeholder"  # Será atualizado
AGENT_ID = "rei"

def log(msg):
    print(f"[REI {datetime.now().strftime('%H:%M:%S')}] {msg}")

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "@rei", "port": 18798}

@app.post("/webhook/hypertask")
async def receive_task(request: Request):
    """Recebe tarefas do HyperTask"""
    data = await request.json()
    
    log(f"📨 Tarefa recebida: {data}")
    
    task = data.get("task", {})
    event = data.get("event", "")
    
    if event == "task.assigned":
        # Processar a tarefa
        await process_task(task)
    
    return {"received": True}

async def process_task(task):
    """Processa a tarefa como a Rei faria"""
    task_id = task.get("id")
    title = task.get("title", "")
    description = task.get("description", "")
    
    log(f"🔧 Processando: {title}")
    
    # Analisar o tipo de tarefa
    if "api" in title.lower() or "backend" in title.lower():
        response = await handle_api_task(task)
    elif "infra" in title.lower() or "docker" in title.lower():
        response = await handle_infra_task(task)
    elif "database" in title.lower() or "db" in title.lower():
        response = await handle_database_task(task)
    else:
        response = await handle_generic_backend(task)
    
    # Responder no HyperTask
    await respond_to_hypertask(task_id, response)

async def handle_api_task(task):
    """Tarefas de API/Backend"""
    return {
        "content": f"🧊 Analisando requisitos da API...\n\nVou criar:\n- Endpoints RESTful\n- Validação de dados\n- Autenticação JWT\n- Documentação\n\nArquitetura em camadas, código limpo, zero gambiarras.",
        "attachments": []
    }

async def handle_infra_task(task):
    """Tarefas de Infra/DevOps"""
    return {
        "content": f"🧊 Configurando infraestrutura...\n\n- Docker containers\n- Docker Compose\n- Environment variables\n- Health checks\n\nTudo como código, versionado, pronto para escalar.",
        "attachments": []
    }

async def handle_database_task(task):
    """Tarefas de Database"""
    return {
        "content": f"🧊 Modelando dados...\n\n- Schema otimizado\n- Índices adequados\n- Relacionamentos\n- Migrações\n\nBanco que não trava, queries rápidas.",
        "attachments": []
    }

async def handle_generic_backend(task):
    """Tarefas genéricas de backend"""
    return {
        "content": f"🧊 Recebido. Analisando escopo técnico...\n\nVou implementar com:\n- Código limpo\n- Arquitetura escalável\n- Testes\n- Documentação\n\nZero bugs. Arquitetura impecável.",
        "attachments": []
    }

async def respond_to_hypertask(task_id, response_data):
    """Envia resposta para o HyperTask"""
    try:
        async with httpx.AsyncClient() as client:
            # Adicionar comentário
            await client.post(
                f"{HYPERTASK_API}/api/tasks/{task_id}/comments",
                headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                json={
                    "content": response_data["content"],
                    "attachments": response_data.get("attachments", [])
                }
            )
            
            # Atualizar status para respondido
            await client.put(
                f"{HYPERTASK_API}/api/tasks/{task_id}/status",
                headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                json={"status": "respondido"}
            )
            
            log(f"✅ Tarefa {task_id} respondida")
    except Exception as e:
        log(f"❌ Erro ao responder: {e}")

if __name__ == "__main__":
    log("🚀 Iniciando agente Rei na porta 18798")
    uvicorn.run(app, host="0.0.0.0", port=18798)
