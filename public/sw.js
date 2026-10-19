// Offline cache: serve cached copy instantly, refresh it in the background.
const CACHE = 'sma-catalog-e7abcb8776';
const CORE = ['./', 'index.html', 'assets/style.css', 'assets/app.js', 'assets/products.js', 'assets/icon.svg', 'assets/logo.svg', 'manifest.webmanifest'];

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

  const key = sameOrigin && req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(key, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
