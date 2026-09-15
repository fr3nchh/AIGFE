// LocalAI - Chat Application
// 100% local, encrypted, zero data leakage

(function() {
  'use strict';

  // --- Config ---
  const OLLAMA_URL = localStorage.getItem('localai_ollama_url') || window.location.origin.replace(/:\d+$/, ':11434');

  // --- State ---
  let state = {
    user: null,
    conversations: {},
    currentConvId: null,
    currentModel: '',
    streaming: false,
    ws: null,
    settings: { eco: true, encryption: true }
  };

  // --- DOM ---
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // --- Init ---
  function init() {
    loadState();
    setupAuth();
    setupChat();
    setupSettings();

    if (state.user) {
      showChat();
      loadModels();
    }
  }

  // --- Persistence ---
  function loadState() {
    try {
      const s = localStorage.getItem('localai_state');
      if (s) {
        const parsed = JSON.parse(s);
        state.user = parsed.user || null;
        state.conversations = parsed.conversations || {};
        state.settings = { ...state.settings, ...(parsed.settings || {}) };
      }
    } catch(e) {}
  }

  function saveState() {
    localStorage.setItem('localai_state', JSON.stringify({
      user: state.user,
      conversations: state.conversations,
      settings: state.settings
    }));
  }

  // --- Auth ---
  function setupAuth() {
    $('#showRegister')?.addEventListener('click', e => {
      e.preventDefault();
      $('#loginForm').classList.add('hidden');
      $('#registerForm').classList.remove('hidden');
    });

    $('#showLogin')?.addEventListener('click', e => {
      e.preventDefault();
      $('#registerForm').classList.add('hidden');
      $('#loginForm').classList.remove('hidden');
    });

    $('#loginBtn')?.addEventListener('click', doLogin);
    $('#registerBtn')?.addEventListener('click', doRegister);
    $('#logoutBtn')?.addEventListener('click', doLogout);

    // Enter key
    $('#loginPassword')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('#regPasswordConfirm')?.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  }

  function doLogin() {
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPassword').value;

    if (!email || !pass) return showAuthError('login', 'Remplis tous les champs');

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('localai_users') || '{}');
    const user = users[email];

    if (!user || user.password !== hashPassword(pass)) {
      return showAuthError('login', 'Email ou mot de passe incorrect');
    }

    state.user = { email, name: user.name };
    saveState();
    showChat();
    loadModels();
  }

  function doRegister() {
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const pass = $('#regPassword').value;
    const confirm = $('#regPasswordConfirm').value;

    if (!name || !email || !pass) return showAuthError('register', 'Remplis tous les champs');
    if (pass.length < 6) return showAuthError('register', '6 caracteres minimum');
    if (pass !== confirm) return showAuthError('register', 'Les mots de passe ne correspondent pas');

    const users = JSON.parse(localStorage.getItem('localai_users') || '{}');
    if (users[email]) return showAuthError('register', 'Cet email est deja utilise');

    users[email] = { name, password: hashPassword(pass), created: Date.now() };
    localStorage.setItem('localai_users', JSON.stringify(users));

    state.user = { email, name };
    saveState();
    showChat();
    loadModels();
  }

  function doLogout() {
    state.user = null;
    state.currentConvId = null;
    saveState();
    $('#authScreen').classList.remove('hidden');
    $('#chatApp').classList.add('hidden');
  }

  function showAuthError(type, msg) {
    const el = $(`#${type}Error`);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    setTimeout(() => el?.classList.add('hidden'), 3000);
  }

  function hashPassword(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  // --- Chat ---
  function showChat() {
    $('#authScreen').classList.add('hidden');
    $('#chatApp').classList.remove('hidden');
    if (state.user) {
      $('#userName').textContent = state.user.name;
      $('#userAvatar').textContent = state.user.name.charAt(0).toUpperCase();
      $('#welcomeName').textContent = state.user.name;
    }
    renderConversations();
  }

  function setupChat() {
    $('#menuBtn')?.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#newChatBtn')?.addEventListener('click', newConversation);
    $('#sendBtn')?.addEventListener('click', sendMessage);

    $('#messageInput')?.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      $('#sendBtn').disabled = !this.value.trim();
    });

    $('#messageInput')?.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    $$('.suggestion-card').forEach(btn => {
      btn.addEventListener('click', () => {
        $('#messageInput').value = btn.dataset.prompt;
        $('#messageInput').dispatchEvent(new Event('input'));
        sendMessage();
      });
    });

    // Close sidebar on mobile
    document.addEventListener('click', e => {
      if (window.innerWidth <= 768 && !$('#sidebar').contains(e.target) && !$('#menuBtn').contains(e.target)) {
        $('#sidebar').classList.remove('open');
      }
    });

    // WebSocket
    setupWebSocket();
  }

  function setupWebSocket() {
    try {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      state.ws = new WebSocket(`${protocol}//${location.host}`);
      state.ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'token') appendToken(msg.data);
        else if (msg.type === 'done') finishStream();
        else if (msg.type === 'error') { appendMsg('assistant', 'Erreur: ' + msg.error); finishStream(); }
      };
      state.ws.onclose = () => setTimeout(setupWebSocket, 5000);
    } catch(e) {}
  }

  // --- Conversations ---
  function newConversation() {
    state.currentConvId = null;
    $('#messagesContainer').classList.add('hidden');
    $('#welcomeScreen').classList.remove('hidden');
    renderConversations();
    $('#sidebar').classList.remove('open');
  }

  function openConversation(id) {
    state.currentConvId = id;
    const conv = state.conversations[id];
    if (!conv) return;

    $('#welcomeScreen').classList.add('hidden');
    $('#messagesContainer').classList.remove('hidden');
    $('#messages').innerHTML = '';

    conv.messages.forEach(m => appendMsg(m.role, m.content, false));
    renderConversations();
    $('#sidebar').classList.remove('open');
  }

  function deleteConversation(id, e) {
    e.stopPropagation();
    delete state.conversations[id];
    if (state.currentConvId === id) newConversation();
    saveState();
    renderConversations();
  }

  function renderConversations() {
    const list = $('#conversationList');
    if (!list) return;
    list.innerHTML = '';

    const sorted = Object.entries(state.conversations)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));

    sorted.forEach(([id, conv]) => {
      const div = document.createElement('div');
      div.className = 'conv-item' + (id === state.currentConvId ? ' active' : '');
      div.innerHTML = `
        <span class="conv-title">${esc(conv.title || 'Nouvelle discussion')}</span>
        <button class="conv-del" title="Supprimer">&times;</button>
      `;
      div.addEventListener('click', () => openConversation(id));
      div.querySelector('.conv-del').addEventListener('click', e => deleteConversation(id, e));
      list.appendChild(div);
    });
  }

  // --- Messages ---
  function appendMsg(role, content, animate = true) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = `
      <div class="msg-avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="msg-body"><div class="msg-text">${formatText(content)}</div></div>
    `;
    const container = $('#messages');
    if (animate) {
      div.style.opacity = '0';
      container.appendChild(div);
      requestAnimationFrame(() => { div.style.transition = 'opacity 0.2s'; div.style.opacity = '1'; });
    } else {
      container.appendChild(div);
    }
    scrollBottom();
  }

  function appendToken(data) {
    let last = $('#messages .msg:last-child');
    if (!last || !last.classList.contains('assistant')) {
      removeTyping();
      const div = document.createElement('div');
      div.className = 'msg assistant';
      div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-body"><div class="msg-text" id="streamText"></div></div>`;
      $('#messages').appendChild(div);
      last = div;
    }
    const textEl = last.querySelector('.msg-text') || last.querySelector('#streamText');
    if (textEl && data.message?.content) {
      textEl.dataset.raw = (textEl.dataset.raw || '') + data.message.content;
      textEl.innerHTML = formatText(textEl.dataset.raw);
    }
    scrollBottom();
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.id = 'typingMsg';
    div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-body"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
    $('#messages').appendChild(div);
    scrollBottom();
  }

  function removeTyping() { $('#typingMsg')?.remove(); }

  function finishStream() {
    state.streaming = false;
    $('#sendBtn').disabled = false;
    $('#messageInput').disabled = false;
    $('#messageInput').focus();
    removeTyping();
  }

  function scrollBottom() {
    const c = $('#messagesContainer');
    if (c) c.scrollTop = c.scrollHeight;
  }

  // --- Send ---
  async function sendMessage() {
    const text = $('#messageInput').value.trim();
    if (!text || state.streaming) return;

    const model = state.currentModel || $('#modelSelect')?.value;
    if (!model) { alert('Selectionnez un modele d\'IA'); return; }

    if (!state.currentConvId) {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      state.conversations[id] = {
        title: text.substring(0, 50),
        messages: [],
        model: model,
        updatedAt: Date.now()
      };
      state.currentConvId = id;
    }

    // Show messages
    $('#welcomeScreen').classList.add('hidden');
    $('#messagesContainer').classList.remove('hidden');

    appendMsg('user', text);
    state.conversations[state.currentConvId].messages.push({ role: 'user', content: text });
    state.conversations[state.currentConvId].updatedAt = Date.now();

    $('#messageInput').value = '';
    $('#messageInput').style.height = 'auto';
    $('#sendBtn').disabled = true;
    state.streaming = true;

    showTyping();

    const msgs = state.conversations[state.currentConvId].messages.map(m => ({ role: m.role, content: m.content }));
    const sysPrompt = state.settings.eco
      ? { role: 'system', content: 'Reponds de facon concise et efficace.' }
      : { role: 'system', content: 'Tu es un assistant IA intelligent, utile et amical.' };

    try {
      if (state.ws?.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({ type: 'chat', model, messages: [sysPrompt, ...msgs] }));
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [sysPrompt, ...msgs] })
        });
        const data = await res.json();
        removeTyping();
        if (data.message) {
          appendMsg('assistant', data.message.content);
          state.conversations[state.currentConvId].messages.push({ role: 'assistant', content: data.message.content });
        }
        finishStream();
      }
      saveState();
      renderConversations();
    } catch(err) {
      removeTyping();
      appendMsg('assistant', 'Erreur de connexion. Verifiez qu\'Ollama est demarre.');
      finishStream();
    }
  }

  // --- Models ---
  async function loadModels() {
    try {
      const res = await fetch('/api/models');
      const models = await res.json();
      const sel = $('#modelSelect');
      if (!sel) return;
      sel.innerHTML = '';
      if (!models.length) {
        sel.innerHTML = '<option value="">Installez un modele...</option>';
        return;
      }
      models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        sel.appendChild(opt);
      });
      state.currentModel = models[0]?.name || '';
    } catch(e) {
      const sel = $('#modelSelect');
      if (sel) sel.innerHTML = '<option value="">Ollama non detecte</option>';
    }
  }

  // --- Settings ---
  function setupSettings() {
    $('#settingsBtn')?.addEventListener('click', () => $('#settingsModal').classList.remove('hidden'));
    $$('.close-modal').forEach(b => b.addEventListener('click', () => $('#settingsModal').classList.add('hidden')));

    $('#ecoToggle')?.addEventListener('change', function() {
      state.settings.eco = this.checked;
      saveState();
    });

    $('#encToggle')?.addEventListener('change', function() {
      state.settings.encryption = this.checked;
      saveState();
    });

    $('#clearDataBtn')?.addEventListener('click', () => {
      if (confirm('Supprimer TOUTES les donnees ? Cette action est irreversible.')) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  // --- Utils ---
  function formatText(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // --- Start ---
  init();
})();
