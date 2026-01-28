/**
 * Xhe-OS IndexedDB Wrapper
 * Provides persistent storage for identities, pulses, slips, and channels
 */

const DB_NAME = 'XheOS';
const DB_VERSION = 1;

const STORES = {
  IDENTITIES: 'identities',
  PULSES: 'pulses',
  SLIPS: 'slips',
  CHANNELS: 'channels'
};

class XheDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Identities store
        if (!db.objectStoreNames.contains(STORES.IDENTITIES)) {
          const identityStore = db.createObjectStore(STORES.IDENTITIES, { keyPath: 'id' });
          identityStore.createIndex('publicKey', 'publicKey', { unique: true });
          identityStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Pulses store
        if (!db.objectStoreNames.contains(STORES.PULSES)) {
          const pulseStore = db.createObjectStore(STORES.PULSES, { keyPath: 'id' });
          pulseStore.createIndex('identityId', 'identityId', { unique: false });
          pulseStore.createIndex('timestamp', 'timestamp', { unique: false });
          pulseStore.createIndex('type', 'type', { unique: false });
        }

        // Slips store
        if (!db.objectStoreNames.contains(STORES.SLIPS)) {
          const slipStore = db.createObjectStore(STORES.SLIPS, { keyPath: 'id' });
          slipStore.createIndex('fromIdentityId', 'fromIdentityId', { unique: false });
          slipStore.createIndex('toIdentityId', 'toIdentityId', { unique: false });
          slipStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Channels store
        if (!db.objectStoreNames.contains(STORES.CHANNELS)) {
          const channelStore = db.createObjectStore(STORES.CHANNELS, { keyPath: 'id' });
          channelStore.createIndex('name', 'name', { unique: true });
          channelStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async add(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new XheDB();
export { STORES };
