// Modern service worker with cache-first for static, network-first for navigation, and update checks
const CACHE_VERSION = 'v1.0.4';
const STATIC_CACHE = `lvl-static-${CACHE_VERSION}`;
const OFFLINE_URL = './index.html';

const ASSETS = [
  './',
  './index.html',
  './css/theme.css',
  './js/main.js',
  './js/storage.js',
  './js/notifications.js',
  './data/activities.json',
  './partials/reflections.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(ASSETS);
    // allow the new SW to move to 'installed' and then wait for skipWaiting message
    // (we still call skipWaiting here as a fallback)
    try{ self.skipWaiting(); }catch(e){}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // notify clients that we are active and caches cleaned
    try{
      const clientsList = await self.clients.matchAll({includeUncontrolled: true});
      clientsList.forEach(c => c.postMessage({ type: 'SW_ACTIVATED', cache: STATIC_CACHE }));
    }catch(e){}
  })());
});

// message handler for skipWaiting and checking updates
self.addEventListener('message', (ev) => {
  try{
    const data = ev.data || {};
    if (data && data.type === 'SKIP_WAITING') {
      // Immediately activate this worker
      try{ self.skipWaiting(); }catch(e){}
    }
    if (data && data.type === 'CHECK_FOR_UPDATE') {
      // simple strategy: re-fetch assets and update cache if changed
      checkForUpdates();
    }
  }catch(e){}
});

async function checkForUpdates(){
  try{
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try{
        const res = await fetch(url, {cache: 'no-store'});
        if (res && res.ok) await cache.put(url, res.clone());
      }catch(e){}
    }));
    // notify clients that an update occurred
    const clientsList = await self.clients.matchAll({includeUncontrolled: true});
    clientsList.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
  }catch(e){}
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // navigation requests -> network first
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try{
        const networkResp = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, networkResp.clone()).catch(()=>{});
        return networkResp;
      }catch(err){
        const cached = await caches.match(OFFLINE_URL);
        return cached || Response.error();
      }
    })());
    return;
  }

  // for other same-origin requests, try cache first then network (cache falling back)
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { caches.open(STATIC_CACHE).then(c=>c.put(req,res.clone())); return res; }).catch(()=>caches.match(OFFLINE_URL))));
});
