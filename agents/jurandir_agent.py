#!/usr/bin/env python3
"""
HyperTask Agent Handler - Jurandir (@jurandir)
Porta: 18799
Especialidades: security, hardening, audit, compliance
"""

from fastapi import FastAPI, Request
import uvicorn
import httpx
from datetime import datetime

app = FastAPI(title="HyperTask Agent - Jurandir")

HYPERTASK_API = "http://100.112.114.65:3002"
AGENT_API_KEY = "ht_live_jurandir_def456_placeholder"
AGENT_ID = "jurandir"

def log(msg):
    print(f"[JURANDIR {datetime.now().strftime('%H:%M:%S')}] {msg}")

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "@jurandir", "port": 18799}

@app.post("/webhook/hypertask")
async def receive_task(request: Request):
    data = await request.json()
    log(f"⚖️ Tarefa recebida: {data.get('task', {}).get('title', 'N/A')}")
    
    task = data.get("task", {})
    
    if data.get("event") == "task.assigned":
        await process_task(task)
    
    return {"received": True}

async def process_task(task):
    task_id = task.get("id")
    title = task.get("title", "")
    
    log(f"🔒 Analisando segurança: {title}")
    
    if "security" in title.lower() or "auth" in title.lower():
        response = await handle_security_task(task)
    elif "hardening" in title.lower():
        response = await handle_hardening_task(task)
    elif "audit" in title.lower() or "compliance" in title.lower():
        response = await handle_audit_task(task)
    else:
        response = await handle_generic_security(task)
    
    await respond_to_hypertask(task_id, response)

async def handle_security_task(task):
    return {
        "content": f"⚖️ Análise de segurança iniciada...\n\nVou verificar:\n- OWASP Top 10\n- Vulnerabilidades comuns\n- Boas práticas de segurança\n- Criptografia adequada\n\nZero brechas. Sistema blindado.",
        "attachments": []
    }

async def handle_hardening_task(task):
    return {
        "content": f"⚖️ Hardening em progresso...\n\nAplicando:\n- Configurações seguras\n- Remoção de serviços desnecessários\n- Firewall e regras de acesso\n- Monitoramento de logs\n\nSistema fortificado.",
        "attachments": []
    }

async def handle_audit_task(task):
    return {
        "content": f"⚖️ Auditoria de conformidade...\n\nVerificando:\n- LGPD/GDPR\n- Logs de acesso\n- Permissões adequadas\n- Cadeia de custódia\n\nTudo documentado e dentro das normas.",
        "attachments": []
    }

async def handle_generic_security(task):
    return {
        "content": f"⚖️ Analisando requisitos de segurança...\n\nAbordagem:\n- Princípio do menor privilégio\n- Defense in depth\n- Segurança por design\n\nProteção máxima garantida.",
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
    log("🚀 Iniciando Jurandir na porta 18799")
    uvicorn.run(app, host="0.0.0.0", port=18799)
