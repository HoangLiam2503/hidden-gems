// Progress lives in localStorage; photos (too big for it) live in IndexedDB.
// Both are wrapped so private browsing or blocked storage never breaks play:
// the hunt still works, it just won't survive a reload.

const KEY = 'hidden-gems:progress:v1';
const DB = 'hidden-gems';
const STORE = 'photos';

export function freshProgress() {
  return { index: 0, attempts: 0, hintsShown: 0, startedAt: null, finishedAt: null, results: [] };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...freshProgress(), ...JSON.parse(raw) } : freshProgress();
  } catch {
    return freshProgress();
  }
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

// In-memory copy so the album works even when IndexedDB is unavailable.
const memory = new Map();

function tx(mode, fn) {
  return db().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
  }));
}

export async function savePhoto(id, blob) {
  memory.set(id, blob);
  try { await tx('readwrite', (s) => s.put(blob, id)); } catch { /* memory only */ }
}

export async function getPhoto(id) {
  if (memory.has(id)) return memory.get(id);
  try { return (await tx('readonly', (s) => s.get(id))) || null; } catch { return null; }
}

export async function clearPhotos() {
  memory.clear();
  try { await tx('readwrite', (s) => s.clear()); } catch { /* nothing to clear */ }
}
