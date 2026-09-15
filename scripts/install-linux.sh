#!/bin/bash
set -e

echo ""
echo "  ============================================"
echo "   LocalAI - Installation Linux/Mac"
echo "   IA Locale Securisee - Aucune fuite de donnees"
echo "  ============================================"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[ERREUR] Docker n'est pas installe !"
    echo ""
    echo "Installation :"
    echo "  curl -fsSL https://get.docker.com | sh"
    echo ""
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "[ERREUR] Docker Compose n'est pas disponible !"
    exit 1
fi

echo "[1/4] Verification de Docker..."
if ! docker info &> /dev/null; then
    echo "Demarrage de Docker..."
    sudo systemctl start docker
fi
echo "      Docker OK !"

echo ""
echo "[2/4] Demarrage de LocalAI..."
cd "$(dirname "$0")/.."
docker compose up -d

echo ""
echo "[3/4] Installation du modele recommande (qwen3:8b)..."
echo "      (Cela peut prendre quelques minutes la premiere fois)"
docker exec localai-ollama ollama pull qwen3:8b

echo ""
echo "[4/4] Installation du modele leger (qwen3:2b)..."
docker exec localai-ollama ollama pull qwen3:2b

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "  ============================================"
echo "   LocalAI est pret !"
echo "  ============================================"
echo ""
echo "   Interface principale : http://localhost:3000"
echo "   Interface legere :     http://localhost:8080"
echo "   Depuis un autre appareil : http://${LOCAL_IP}:3000"
echo ""
echo "   Pour installer d'autres modeles :"
echo "     docker exec localai-ollama ollama pull gemma4:4b"
echo "     docker exec localai-ollama ollama pull llama3.1:8b"
echo ""
echo "  ============================================"
echo ""
