# AGENTS.md - Guide pour les agents de developpement

## Commandes a executer

### Demarrer le projet
```bash
docker compose up -d
```

### Voir les logs
```bash
docker compose logs -f
docker compose logs -f ollama
docker compose logs -f webui
```

### Installer un modele
```bash
docker exec localai-ollama ollama pull [nom-modele]
```

### Tester l'API
```bash
curl http://localhost:11434/api/tags
curl http://localhost:11434/api/chat -d '{"model":"qwen3:8b","messages":[{"role":"user","content":"Bonjour"}]}'
```

### Arreter
```bash
docker compose down
```

### Rebuild apres modification
```bash
docker compose up -d --build
```

## Structure du code

- `web/public/index.html` - Interface principale
- `web/public/css/style.css` - Styles responsive (mobile-first)
- `web/public/js/app.js` - Logique applicative
- `web/public/js/crypto.js` - Chiffrement AES-256-GCM cote client
- `web/server.js` - Serveur Express + WebSocket proxy vers Ollama
- `docker-compose.yml` - Orchestration des services

## Conventions

- Pas de commentaires inutiles dans le code
- Fonctions courtes et claires
- Variables en camelCase
- CSS en BEM simple
- Tout en francais dans l'UI, anglais dans le code
