#!/bin/bash
set -e

echo ""
echo "  ============================================"
echo "   LocalAI - Installation Mac (Apple Silicon)"
echo "   IA Locale Securisee - Aucune fuite de donnees"
echo "  ============================================"
echo ""

# Check Docker Desktop
if ! command -v docker &> /dev/null; then
    echo "[ERREUR] Docker Desktop n'est pas installe !"
    echo ""
    echo "Telechargez Docker Desktop pour Mac depuis :"
    echo "https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "Ou installez via Homebrew :"
    echo "  brew install --cask docker"
    echo ""
    exit 1
fi

echo "[1/4] Verification de Docker..."
if ! docker info &> /dev/null; then
    echo "Demarrage de Docker Desktop..."
    open -a Docker
    echo "Attendez que Docker demarre (icone dans la barre de menu)..."
    sleep 10
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
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")

echo ""
echo "  ============================================"
echo "   LocalAI est pret !"
echo "  ============================================"
echo ""
echo "   Interface principale : http://localhost:3000"
echo "   Interface legere :     http://localhost:8080"
echo "   Depuis un autre appareil : http://${LOCAL_IP}:3000"
echo ""
echo "   Modeles recommandes pour Mac :"
echo "     16GB RAM : qwen3:8b, gemma4:4b"
echo "     32GB RAM : qwen3:14b, gemma4:12b"
echo "     64GB+ RAM : qwen3:27b, gemma4:26b"
echo ""
echo "   Pour installer :"
echo "     docker exec localai-ollama ollama pull [modele]"
echo ""
echo "  ============================================"
echo ""
