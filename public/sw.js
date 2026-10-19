// Offline support.
// - Pages: network first, so a new deploy shows immediately; the cached copy is used only when offline.
// - Versioned files (app.js?v=…, style.css?v=…, products.js?v=…): cache first, since a new version gets a new URL.
// - Everything else (logos, icons, fonts): cached copy instantly, refreshed in the background.
const CACHE = 'sma-catalog-1a9a165131';
const CORE = ['./', 'assets/logo.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put('./', res.clone()));
        return res;
      }).catch(() => caches.match('./'))
    );
    return;
  }

  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req);
    if (cached && url.searchParams.has('v')) return cached;
    const network = fetch(req).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
