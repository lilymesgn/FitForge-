// Fit Tracker PRO — Service Worker
// Cache strategy:
//   • App shell (JS/CSS/HTML) → Cache first, update in background
//   • Open Food Facts API     → Network first, cache fallback (5min TTL)
//   • Everything else         → Network only

const CACHE_NAME = 'fittracker-v1';
const API_CACHE  = 'fittracker-api-v1';

const SHELL_PATTERNS = [
  /\.(js|css|woff2?|ttf|svg|png)$/,
  /^\/($|index\.html)/,
];

// Install: pre-cache nothing (let pages cache on first load)
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Open Food Facts — network first, cache 5 minutes
  if (url.hostname === 'world.openfoodfacts.org') {
    e.respondWith(networkFirstWithTTL(request, API_CACHE, 300));
    return;
  }

  // App shell assets — cache first
  if (SHELL_PATTERNS.some(p => p.test(url.pathname))) {
    e.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Everything else — network only (auth calls, openai, etc.)
  // Let the browser handle natively; don't intercept
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function networkFirstWithTTL(request, cacheName, ttlSeconds) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const headers = new Headers(fresh.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const toCache = new Response(await fresh.clone().blob(), { status: fresh.status, headers });
      cache.put(request, toCache);
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (!cached) throw new Error('Offline and no cache');
    const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0', 10);
    if (Date.now() - cachedAt < ttlSeconds * 1000) return cached;
    throw new Error('Cache expired and network unavailable');
  }
}
