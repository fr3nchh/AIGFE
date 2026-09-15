// LocalAI - Main Application
// 100% local, encrypted, no data leakage

(function() {
  'use strict';

  // --- State ---
  const state = {
    currentModel: '',
    conversations: {},
    currentConvId: null,
    encKey: null,
    ws: null,
    streaming: false,
    settings: {
      ecoMode: true,
      encryption: true,
      history: true,
      ollamaUrl: 'http://localhost:11434'
    }
  };

  // --- DOM Elements ---
  const $ = (sel) => document.querySelector(sel);
  const sidebar = $('#sidebar');
  const messages = $('#messages');
  const welcome = $('#welcome');
  const userInput = $('#userInput');
  const sendBtn = $('#sendBtn');
  const modelSelect = $('#modelSelect');
  const convList = $('#conversations');
  const tokenCount = $('#tokenCount');

  // --- Initialize ---
  async function init() {
    loadSettings();
    state.encKey = localStorage.getItem('localai_enc_key');
    if (!state.encKey) {
      state.encKey = await LocalCrypto.generateKey();
      localStorage.setItem('localai_enc_key', state.encKey);
    }

    loadConversations();
    await loadModels();
    setupEventListeners();
    setupWebSocket();
  }

  // --- Settings ---
  function loadSettings() {
    const saved = localStorage.getItem('localai_settings');
    if (saved) {
      Object.assign(state.settings, JSON.parse(saved));
    }
    $('#ecoMode').checked = state.settings.ecoMode;
    $('#encryptionToggle').checked = state.settings.encryption;
    $('#historyToggle').checked = state.settings.history;
    $('#ollamaUrl').value = state.settings.ollamaUrl;
    updateEcoBadge();
  }

  function saveSettings() {
    localStorage.setItem('localai_settings', JSON.stringify(state.settings));
    updateEcoBadge();
  }

  function updateEcoBadge() {
    const badge = $('#ecoBadge');
    if (state.settings.ecoMode) {
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // --- Models ---
  async function loadModels() {
    try {
      const res = await fetch('/api/models');
      const models = await res.json();
      modelSelect.innerHTML = '';
      if (models.length === 0) {
        modelSelect.innerHTML = '<option value="">Aucun modele - Installez-en un</option>';
        return;
      }
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        modelSelect.appendChild(opt);
      });
      if (!state.currentModel && models.length > 0) {
        state.currentModel = models[0].name;
        modelSelect.value = state.currentModel;
      }
    } catch (e) {
      modelSelect.innerHTML = '<option value="">Erreur de connexion</option>';
    }
  }

  // --- WebSocket ---
  function setupWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    state.ws = new WebSocket(`${protocol}//${location.host}`);

    state.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'token') {
        appendToken(msg.data);
      } else if (msg.type === 'done') {
        finishStreaming();
      } else if (msg.type === 'error') {
        appendMessage('assistant', `Erreur: ${msg.error}`);
        finishStreaming();
      }
    };

    state.ws.onclose = () => {
      setTimeout(setupWebSocket, 3000);
    };
  }

  // --- Conversations ---
  function loadConversations() {
    const saved = localStorage.getItem('localai_conversations');
    if (saved) {
      state.conversations = JSON.parse(saved);
    }
    renderConversationList();
  }

  function saveConversations() {
    if (state.settings.history) {
      localStorage.setItem('localai_conversations', JSON.stringify(state.conversations));
    }
  }

  function renderConversationList() {
    convList.innerHTML = '';
    const sorted = Object.entries(state.conversations)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));

    sorted.forEach(([id, conv]) => {
      const item = document.createElement('div');
      item.className = `conversation-item ${id === state.currentConvId ? 'active' : ''}`;
      item.innerHTML = `
        <span class="title">${escapeHtml(conv.title || 'Nouvelle discussion')}</span>
        <button class="delete-btn" data-id="${id}">&times;</button>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
          deleteConversation(e.target.dataset.id);
          return;
        }
        openConversation(id);
      });
      convList.appendChild(item);
    });
  }

  function createConversation(title) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    state.conversations[id] = {
      title: title || 'Nouvelle discussion',
      messages: [],
      model: state.currentModel,
      updatedAt: Date.now()
    };
    state.currentConvId = id;
    saveConversations();
    renderConversationList();
    return id;
  }

  function openConversation(id) {
    state.currentConvId = id;
    const conv = state.conversations[id];
    if (!conv) return;

    state.currentModel = conv.model || state.currentModel;
    modelSelect.value = state.currentModel;

    messages.innerHTML = '';
    messages.classList.add('active');
    welcome.style.display = 'none';

    conv.messages.forEach(msg => {
      appendMessage(msg.role, msg.content, false);
    });

    renderConversationList();
  }

  function deleteConversation(id) {
    delete state.conversations[id];
    if (state.currentConvId === id) {
      state.currentConvId = null;
      messages.innerHTML = '';
      messages.classList.remove('active');
      welcome.style.display = 'flex';
    }
    saveConversations();
    renderConversationList();
  }

  // --- Messages ---
  function appendMessage(role, content, animate = true) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `
      <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="message-content">
        <div class="message-text">${formatMessage(content)}</div>
      </div>
    `;
    if (animate) {
      div.style.opacity = '0';
      div.style.transform = 'translateY(8px)';
      messages.appendChild(div);
      requestAnimationFrame(() => {
        div.style.transition = 'opacity 0.2s, transform 0.2s';
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';
      });
    } else {
      messages.appendChild(div);
    }
    scrollToBottom();
  }

  function appendToken(data) {
    let lastMsg = messages.querySelector('.message:last-child .message-text');
    if (!lastMsg || lastMsg.dataset.role !== 'assistant') {
      const div = document.createElement('div');
      div.className = 'message assistant';
      div.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <div class="message-text" data-role="assistant"></div>
        </div>
      `;
      messages.appendChild(div);
      lastMsg = div.querySelector('.message-text');
    }
    if (data.message && data.message.content) {
      lastMsg.dataset.role = 'assistant';
      lastMsg.innerHTML = formatMessage(lastMsg.textContent + data.message.content);
    }
    scrollToBottom();
  }

  function showThinking() {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.id = 'thinkingMsg';
    div.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="thinking-indicator">
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
        </div>
      </div>
    `;
    messages.appendChild(div);
    scrollToBottom();
  }

  function removeThinking() {
    const el = $('#thinkingMsg');
    if (el) el.remove();
  }

  function finishStreaming() {
    state.streaming = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
    removeThinking();
  }

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  // --- Send Message ---
  async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || state.streaming) return;

    const model = state.currentModel || modelSelect.value;
    if (!model) {
      alert('Veuillez selecting ou installer un modele d\'IA');
      return;
    }

    // Create conversation if needed
    if (!state.currentConvId) {
      createConversation(text.substring(0, 50));
    }

    // Add user message
    appendMessage('user', text);
    state.conversations[state.currentConvId].messages.push({ role: 'user', content: text });
    state.conversations[state.currentConvId].updatedAt = Date.now();

    // Update title from first message
    if (state.conversations[state.currentConvId].messages.length === 1) {
      state.conversations[state.currentConvId].title = text.substring(0, 50);
    }

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Show thinking
    state.streaming = true;
    sendBtn.disabled = true;
    userInput.disabled = true;
    showThinking();

    // Build messages array
    const allMessages = state.conversations[state.currentConvId].messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Add system prompt for eco mode
    const systemMsg = state.settings.ecoMode
      ? { role: 'system', content: 'Reponds de facon concise et efficace pour economiser l\'energie.' }
      : { role: 'system', content: 'Tu es un assistant IA intelligent et utile.' };

    const ollamaMessages = [systemMsg, ...allMessages];

    try {
      // Try streaming via WebSocket
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
          type: 'chat',
          model: model,
          messages: ollamaMessages
        }));
      } else {
        // Fallback to non-streaming
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: ollamaMessages,
            conversationId: state.currentConvId,
            encKey: state.settings.encryption ? state.encKey : null
          })
        });
        const data = await res.json();
        removeThinking();
        if (data.message) {
          appendMessage('assistant', data.message.content);
          state.conversations[state.currentConvId].messages.push({
            role: 'assistant',
            content: data.message.content
          });
        }
        finishStreaming();
      }
      saveConversations();
    } catch (err) {
      removeThinking();
      appendMessage('assistant', `Erreur de connexion: ${err.message}`);
      finishStreaming();
    }
  }

  // --- Utilities ---
  function formatMessage(text) {
    // Basic markdown
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Send
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
      userInput.style.height = 'auto';
      userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
      sendBtn.disabled = !userInput.value.trim();
    });

    // Model selection
    modelSelect.addEventListener('change', (e) => {
      state.currentModel = e.target.value;
      if (state.currentConvId && state.conversations[state.currentConvId]) {
        state.conversations[state.currentConvId].model = state.currentModel;
        saveConversations();
      }
    });

    // Sidebar toggle
    $('#openSidebar').addEventListener('click', () => {
      sidebar.classList.remove('hidden');
    });
    $('#closeSidebar').addEventListener('click', () => {
      sidebar.classList.add('hidden');
    });

    // New chat
    $('#newChat').addEventListener('click', () => {
      state.currentConvId = null;
      messages.innerHTML = '';
      messages.classList.remove('active');
      welcome.style.display = 'flex';
      renderConversationList();
    });

    // Quick prompts
    document.querySelectorAll('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        userInput.value = btn.dataset.prompt;
        userInput.dispatchEvent(new Event('input'));
        sendMessage();
      });
    });

    // Settings
    $('#settingsBtn').addEventListener('click', () => {
      $('#settingsModal').classList.remove('hidden');
    });
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        $('#settingsModal').classList.add('hidden');
      });
    });

    // Settings changes
    $('#ecoMode').addEventListener('change', (e) => {
      state.settings.ecoMode = e.target.checked;
      saveSettings();
    });
    $('#encryptionToggle').addEventListener('change', (e) => {
      state.settings.encryption = e.target.checked;
      saveSettings();
    });
    $('#historyToggle').addEventListener('change', (e) => {
      state.settings.history = e.target.checked;
      saveSettings();
    });
    $('#ollamaUrl').addEventListener('change', (e) => {
      state.settings.ollamaUrl = e.target.value;
      saveSettings();
    });

    // Pull model
    $('#pullModel').addEventListener('click', async () => {
      const name = $('#modelName').value.trim();
      if (!name) return;
      const status = $('#pullStatus');
      status.classList.remove('hidden');
      status.textContent = `Installation de ${name}...`;
      try {
        const res = await fetch('/api/pull', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: name })
        });
        const data = await res.json();
        status.textContent = data.success ? `${name} installe !` : `Erreur: ${data.error}`;
        if (data.success) loadModels();
      } catch (err) {
        status.textContent = `Erreur: ${err.message}`;
      }
    });

    // Clear all data
    $('#clearAllData').addEventListener('click', () => {
      if (confirm('Supprimer TOUTES les donnees ? Cette action est irreversible.')) {
        localStorage.clear();
        state.conversations = {};
        state.currentConvId = null;
        saveConversations();
        location.reload();
      }
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          !sidebar.contains(e.target) &&
          !$('#openSidebar').contains(e.target) &&
          !sidebar.classList.contains('hidden')) {
        sidebar.classList.add('hidden');
      }
    });
  }

  // --- Start ---
  init();
})();
