# 🔒 LocalAI - IA Locale 100% Securisee

**Aucune donnee ne quitte jamais votre appareil.**

LocalAI est une interface web moderne et securisee pour interagir avec des modeles d'IA 100% locaux. Aucune donnee n'est transmise a des serveurs externes, meme le developpeur ne peut rien voir.

## ✨ Fonctionnalites

- **100% Local** - Tout tourne sur votre machine, aucune connexion internet requise
- **Chiffrement AES-256-GCM** - Les conversations sont chiffrees cote client
- **Zero fuite de donnees** - Meme le serveur ne voit pas les messages en clair
- **Mode Eco** - Reduit la consommation d'energie pour l'environnement
- **Multi-appareils** - Phone, PC, tablette - meme experience partout
- **Interface moderne** - Design ChatGPT, rapide et fluide
- **Modeles non censures** - Dolphin, Gemma Abliterated, Qwen Uncensored
- **Open source** - Code 100% transparent, auditable

## 🚀 Installation rapide

### Windows
```bat
scripts\install-windows.bat
```

### Linux / Mac
```bash
chmod +x scripts/install-linux.sh
./scripts/install-linux.sh
```

### Mac (Apple Silicon)
```bash
chmod +x scripts/install-mac.sh
./scripts/install-mac.sh
```

### Manuellement (Docker)
```bash
docker compose up -d
docker exec localai-ollama ollama pull qwen3:8b
```

## 📱 Acceder depuis d'autres appareils

1. Trouvez votre IP locale : `ipconfig` (Windows) ou `ip addr` (Linux/Mac)
2. Ouvrez `http://[VOTRE-IP]:3000` sur votre phone/tablette
3. C'est tout !

## 🔐 Securite

### Chiffrement
- Toutes les conversations sont chiffrees avec **AES-256-GCM**
- La cle de chiffrement reste dans votre navigateur (localStorage)
- Le serveur ne voit que du texte chiffre (indecryptable sans la cle)

### Aucune fuite
- Zero telemetry, zero analytics, zero tracking
- Aucun appel reseau sortant (sauf telechargement de modeles)
- Aucun compte requis, aucune inscription
- Tout est open source, auditable

### Bonnes pratiques
- Changez `WEBUI_SECRET_KEY` dans `.env` en production
- Utilisez un pare-feu pour limiter l'acces au reseau local
- Activez le chiffrement dans les parametres

## 🌱 Mode Eco

Le mode eco reduit la consommation d'energie :
- Reponses plus courtes et concises
- Modeles plus petits charges par defaut
- Pas de mode "pensee" inutile

## 🤖 Modeles recommandes

### Pour PC modeste (8GB RAM)
```bash
docker exec localai-ollama ollama pull qwen3:2b          # ~2GB, rapide
docker exec localai-ollama ollama pull phi4-mini          # ~3GB, intelligent
```

### Pour PC correct (16GB RAM)
```bash
docker exec localai-ollama ollama pull qwen3:8b          # ~5GB, excellent
docker exec localai-ollama ollama pull gemma4:4b          # ~4GB, Google
```

### Pour PC puissant (32GB+ RAM)
```bash
docker exec localai-ollama ollama pull qwen3:27b         # ~17GB, frontier
docker exec localai-ollama ollama pull gemma4:26b         # ~19GB, MoE
```

### Modeles non censures
```bash
docker exec localai-ollama ollama pull dolphin3           # ~5GB, uncensored
docker exec localai-ollama ollama pull llama2-uncensored  # ~4GB, uncensored
```

## 🏗️ Architecture

```
localai/
├── docker-compose.yml      # Configuration Docker
├── .env                    # Variables d'environnement
├── web/                    # Interface web legere
│   ├── public/             # Frontend (HTML/CSS/JS)
│   │   ├── index.html      # Page principale
│   │   ├── css/style.css   # Styles responsive
│   │   └── js/
│   │       ├── app.js      # Logique applicative
│   │       └── crypto.js   # Chiffrement client
│   ├── server.js           # Serveur Express + WebSocket
│   └── Dockerfile          # Image Docker
├── scripts/                # Scripts d'installation
│   ├── install-windows.bat
│   ├── install-linux.sh
│   └── install-mac.sh
└── data/                   # Donnees chiffrees (gitignore)
```

## ⚙️ Configuration

Editez le fichier `.env` :

```env
# Cle secrete (changez-la !)
WEBUI_SECRET_KEY=votre-cle-secrete-ici

# Modeles par defaut
DEFAULT_MODEL=qwen3:8b
LIGHT_MODEL=qwen3:2b

# Mode eco
ECO_MODE=true
```

## 🛠️ Commandes utiles

```bash
# Demarrer
docker compose up -d

# Arreter
docker compose down

# Voir les logs
docker compose logs -f

# Installer un modele
docker exec localai-ollama ollama pull [nom-du-modele]

# Lister les modeles
docker exec localai-ollama ollama list

# Supprimer un modele
docker exec localai-ollama ollama rm [nom-du-modele]
```

## 📄 Licence

MIT License - Faites ce que vous voulez, c'est votre donnees.

## 🤝 Contribuer

1. Fork le projet
2. Creer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit (`git commit -m 'Ajout feature'`)
4. Push (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## ⚠️ Avertissement

Ce projet est un outil. Vous etes responsable de l'usage que vous en faites.
Les modeles non censures ne sont pas filtres - utilisez les de maniere responsable.
