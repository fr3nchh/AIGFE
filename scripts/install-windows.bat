@echo off
chcp 65001 >nul
echo.
echo  ============================================
echo   LocalAI - Installation Windows
echo   IA Locale Securisee - Aucune fuite de donnees
echo  ============================================
echo.

:: Check Docker
where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Docker n'est pas installe !
    echo.
    echo Telechargez Docker Desktop depuis :
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

:: Check Docker Compose
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Docker Compose n'est pas disponible !
    echo Mettez a jour Docker Desktop.
    pause
    exit /b 1
)

echo [1/4] Verification de Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker n'est pas demarre. Demarrage...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Attendez que Docker demarre, puis relancez ce script.
    pause
    exit /b 1
)
echo       Docker OK !

echo.
echo [2/4] Demarrage de LocalAI...
cd /d "%~dp0"
docker compose up -d

echo.
echo [3/4] Installation du modele recommande (qwen3:8b)...
echo       (Cela peut prendre quelques minutes la premiere fois)
docker exec localai-ollama ollama pull qwen3:8b

echo.
echo [4/4] Installation du modele leger (qwen3:2b)...
docker exec localai-ollama ollama pull qwen3:2b

echo.
echo  ============================================
echo   LocalAI est pret !
echo  ============================================
echo.
echo   Interface principale : http://localhost:3000
echo   Interface legere :     http://localhost:8080
echo   Depuis un autre appareil : http://[VOTRE-IP]:3000
echo.
echo   Pour installer d'autres modeles :
echo     docker exec localai-ollama ollama pull gemma4:4b
echo     docker exec localai-ollama ollama pull llama3.1:8b
echo.
echo  ============================================
echo.
pause
