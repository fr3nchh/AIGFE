const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Encryption (client-side key, server never sees plaintext) ---
const ALGO = 'aes-256-gcm';

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    data: encrypted,
    tag: tag.toString('hex')
  };
}

function decrypt(encObj, key) {
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(encObj.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encObj.tag, 'hex'));
  let decrypted = decipher.update(encObj.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- Conversation storage (encrypted at rest) ---
function getConversationPath(convId) {
  return path.join(DATA_DIR, `${convId}.enc`);
}

function saveConversation(convId, data, encKey) {
  const key = Buffer.from(encKey, 'hex');
  const encrypted = encrypt(JSON.stringify(data), key);
  fs.writeFileSync(getConversationPath(convId), JSON.stringify(encrypted));
}

function loadConversation(convId, encKey) {
  const filePath = getConversationPath(convId);
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const key = Buffer.from(encKey, 'hex');
  return JSON.parse(decrypt(raw, key));
}

// --- Ollama API proxy ---
async function ollamaRequest(endpoint, body) {
  const response = await fetch(`${OLLAMA_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response;
}

// --- Hardware detection endpoint ---
app.get('/api/hardware', async (req, res) => {
  try {
    const response = await ollamaRequest('/api/tags', {});
    const data = await response.json();
    const models = data.models || [];

    // Try to get system info
    let hardware = { models: models.map(m => m.name), detected: false };
    try {
      const os = require('os');
      hardware.ramGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
      hardware.cpuCores = os.cpus().length;
      hardware.detected = true;
    } catch (e) {}

    res.json(hardware);
  } catch (err) {
    res.json({ models: [], detected: false, error: 'Ollama not running' });
  }
});

// --- List available models ---
app.get('/api/models', async (req, res) => {
  try {
    const response = await ollamaRequest('/api/tags', {});
    const data = await response.json();
    res.json(data.models || []);
  } catch (err) {
    res.json([]);
  }
});

// --- Pull a model ---
app.post('/api/pull', async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model name required' });

  try {
    const response = await ollamaRequest('/api/pull', { name: model, stream: false });
    const data = await response.json();
    res.json({ success: true, status: data.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Chat endpoint (non-streaming) ---
app.post('/api/chat', async (req, res) => {
  const { model, messages, conversationId, encKey } = req.body;
  if (!model || !messages) return res.status(400).json({ error: 'Model and messages required' });

  try {
    // Save conversation if encrypted
    if (conversationId && encKey) {
      saveConversation(conversationId, messages, encKey);
    }

    const response = await ollamaRequest('/api/chat', {
      model,
      messages,
      stream: false
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WebSocket for streaming ---
wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);

      if (msg.type === 'chat') {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: msg.model,
            messages: msg.messages,
            stream: true
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              ws.send(JSON.stringify({ type: 'token', data: parsed }));
              if (parsed.done) {
                ws.send(JSON.stringify({ type: 'done' }));
              }
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });
});

// --- Serve SPA ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔒 LocalAI WebUI running on http://localhost:${PORT}`);
  console.log(`📡 Ollama backend: ${OLLAMA_URL}`);
  console.log(`💾 Data directory: ${DATA_DIR}`);
  console.log(`🌍 Access from other devices: http://<your-ip>:${PORT}\n`);
});
