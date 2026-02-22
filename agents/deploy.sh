#!/bin/bash
# Deploy completo dos agentes HyperTask
# Executar como root

echo "🚀 Deploy dos Agentes HyperTask"
echo "================================"

# Copiar serviços
sudo cp /home/docker/projects/hypertask/agents/*.service /etc/systemd/system/

# Recarregar systemd
sudo systemctl daemon-reload

# Iniciar serviços
sudo systemctl enable --now hypertask-rei
sudo systemctl enable --now hypertask-jurandir
sudo systemctl enable --now hypertask-gardenia

echo ""
echo "✅ Serviços instalados!"
echo ""
echo "Status:"
sudo systemctl status hypertask-rei --no-pager -l
sudo systemctl status hypertask-jurandir --no-pager -l
sudo systemctl status hypertask-gardenia --no-pager -l

echo ""
echo "Logs (Ctrl+C para sair):"
echo "sudo journalctl -u hypertask-rei -f"
