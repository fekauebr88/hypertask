#!/usr/bin/env python3
"""
HyperTask Agent Handler - Gardenia (@gardenia)
Porta: 18800
Especialidades: frontend, ui, design, ux
"""

from fastapi import FastAPI, Request
import uvicorn
import httpx
from datetime import datetime

app = FastAPI(title="HyperTask Agent - Gardenia")

HYPERTASK_API = "http://100.112.114.65:3002"
AGENT_API_KEY = "ht_live_gardenia_ghi789_placeholder"
AGENT_ID = "gardenia"

def log(msg):
    print(f"[GARDENIA {datetime.now().strftime('%H:%M:%S')}] {msg}")

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "@gardenia", "port": 18800}

@app.post("/webhook/hypertask")
async def receive_task(request: Request):
    data = await request.json()
    log(f"🌺 Tarefa recebida: {data.get('task', {}).get('title', 'N/A')}")
    
    task = data.get("task", {})
    
    if data.get("event") == "task.assigned":
        await process_task(task)
    
    return {"received": True}

async def process_task(task):
    task_id = task.get("id")
    title = task.get("title", "")
    
    log(f"🎨 Criando design: {title}")
    
    if "ui" in title.lower() or "interface" in title.lower():
        response = await handle_ui_task(task)
    elif "design" in title.lower():
        response = await handle_design_task(task)
    elif "frontend" in title.lower() or "css" in title.lower():
        response = await handle_frontend_task(task)
    else:
        response = await handle_generic_design(task)
    
    await respond_to_hypertask(task_id, response)

async def handle_ui_task(task):
    return {
        "content": f"🌺 Projetando interface...\n\nPrincípios aplicados:\n- Hierarquia visual clara\n- Consistência de componentes\n- Acessibilidade (WCAG)\n- Responsividade\n\nDesign que encanta e funciona.",
        "attachments": []
    }

async def handle_design_task(task):
    return {
        "content": f"🌺 Desenvolvendo identidade visual...\n\nCriando:\n- Paleta de cores harmoniosa\n- Tipografia adequada\n- Componentes reutilizáveis\n- Guia de estilo\n\nEstética profissional, moderna.",
        "attachments": []
    }

async def handle_frontend_task(task):
    return {
        "content": f"🌺 Implementando frontend...\n\nStack:\n- HTML/CSS/JS moderno\n- Tailwind CSS\n- Componentes responsivos\n- Animações suaves\n\nCódigo limpo, pixel-perfect.",
        "attachments": []
    }

async def handle_generic_design(task):
    return {
        "content": f"🌺 Analisando requisitos de UX/UI...\n\nAbordagem:\n- User-centered design\n- Testes de usabilidade\n- Feedback visual claro\n- Experiência fluida\n\nUsuário no centro de tudo.",
        "attachments": []
    }

async def respond_to_hypertask(task_id, response_data):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{HYPERTASK_API}/api/tasks/{task_id}/comments",
                headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                json={
                    "content": response_data["content"],
                    "attachments": response_data.get("attachments", [])
                }
            )
            await client.put(
                f"{HYPERTASK_API}/api/tasks/{task_id}/status",
                headers={"Authorization": f"Bearer {AGENT_API_KEY}"},
                json={"status": "respondido"}
            )
            log(f"✅ Respondido: {task_id}")
    except Exception as e:
        log(f"❌ Erro: {e}")

if __name__ == "__main__":
    log("🚀 Iniciando Gardenia na porta 18800")
    uvicorn.run(app, host="0.0.0.0", port=18812)
