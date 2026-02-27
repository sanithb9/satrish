/* StockSense AI — Service Worker (GitHub Pages safe)
   No skipWaiting / clients.claim to prevent reload loops */
const CACHE = 'stocksense-v1';

self.addEventListener('install', e => {
  // Cache static assets using relative paths
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll([
        './',
        './index.html',
        './css/styles.css',
        './js/api.js',
        './js/analysis.js',
        './js/app.js',
        './manifest.json'
      ]).catch(() => { /* ignore cache-add errors */ })
    )
    // NO skipWaiting() — prevents reload loop
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
    // NO clients.claim() — prevents reload loop
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Network-first for external API calls
  if (url.includes('yahoo.com') || url.includes('finnhub') || url.includes('corsproxy') ||
      url.includes('gnews') || url.includes('newsapi') || url.includes('dataviz.cnn')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('null', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
