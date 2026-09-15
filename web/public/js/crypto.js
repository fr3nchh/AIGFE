// Client-side encryption using Web Crypto API
// Server never sees plaintext data

const LocalCrypto = {
  async generateKey() {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', key);
    return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async importKey(hexKey) {
    const bytes = new Uint8Array(hexKey.match(/.{2}/g).map(b => parseInt(b, 16)));
    return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  },

  async encrypt(text, hexKey) {
    const key = await this.importKey(hexKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      data: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  },

  async decrypt(encObj, hexKey) {
    const key = await this.importKey(hexKey);
    const iv = new Uint8Array(encObj.iv.match(/.{2}/g).map(b => parseInt(b, 16)));
    const data = new Uint8Array(encObj.data.match(/.{2}/g).map(b => parseInt(b, 16)));
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  },

  // Generate a random session key
  generateSessionKey() {
    return crypto.getRandomValues(new Uint8Array(32));
  }
};

window.LocalCrypto = LocalCrypto;
