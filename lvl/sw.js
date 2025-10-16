// Simple service worker for offline caching of static assets
const CACHE_NAME = 'lvl-static-v2';
// Use relative paths so the SW scope (e.g. /lvl/) resolves correctly on GitHub Pages
const ASSETS = [
  './',
  './index.html',
  './css/theme.css',
  './js/main.js',
  './js/storage.js',
  './js/notifications.js',
  './data/activities.json',
  './partials/reflections.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Listen for messages from the page (e.g., skip waiting to activate new SW immediately)
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data && data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (e) { /* ignore */ }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET requests for navigation or same-origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Network-first for navigation requests (index.html) to pick up updates
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => { caches.open(CACHE_NAME).then(c => c.put(req, res.clone())); return res; }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { 
    // cache the response for offline use
    caches.open(CACHE_NAME).then(cache => { try { cache.put(req, res.clone()); } catch(e){} });
    return res;
  }).catch(() => caches.match('index.html'))));
});
