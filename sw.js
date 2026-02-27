/* StockSense AI — Service Worker */
const CACHE = 'stocksense-v1';
const STATIC = [
  '/', '/index.html', '/css/styles.css',
  '/js/api.js', '/js/analysis.js', '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // Network-first for API calls; cache-first for static assets
  if (request.url.includes('finance.yahoo') || request.url.includes('finnhub') || request.url.includes('corsproxy')) {
    e.respondWith(fetch(request).catch(() => new Response('[]', { headers: { 'Content-Type': 'application/json' } })));
  } else {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then(cache => cache.put(request, c)); }
        return res;
      }))
    );
  }
});
