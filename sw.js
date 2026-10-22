// Offline support. Code is network-first (so new deploys show up right away);
// the AI model, library and images are cache-first (big and rarely change).
// Bump VERSION when the model or reference photos change.

const VERSION = 'v3';
const CACHE = `hidden-gems-${VERSION}`;
const PRECACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'gems.js',
  'geo.js',
  'vision.js',
  'store.js',
  'album.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vendor/tf.min.js',
  'model/model.json',
  'model/group1-shard1of3.bin',
  'model/group1-shard2of3.bin',
  'model/group1-shard3of3.bin',
  'gems/botany/ref1.jpg',
  'gems/botany/ref2.jpg',
  'gems/botany/ref3.jpg',
  'gems/taylor/ref1.jpg',
  'gems/taylor/ref2.jpg',
  'gems/taylor/ref3.jpg',
  'gems/weeping/ref1.jpg',
  'gems/weeping/ref2.jpg',
  'gems/weeping/ref3.jpg',
  'gems/chalk/ref1.jpg',
  'gems/chalk/ref2.jpg',
  'gems/chalk/ref3.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

const cacheFirst = /\/(vendor|model|gems|icons)\//;

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (cacheFirst.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
      return res;
    })));
    return;
  }

  // no-cache: revalidate with the server so a fresh deploy is never masked by HTTP caching.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
