const CACHE_NAME = 'dads-assistant-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// External assets to cache (CDNs)
const EXTERNAL_DOMAINS = [
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn-icons-png.flaticon.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Handle External CDN Caching (Stale-While-Revalidate)
  if (EXTERNAL_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // If offline and fetch fails, we just hope we have a cached version
             return cachedResponse; 
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Handle App Assets (Cache First, Network Fallback)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Fallback for navigation (if offline and page not found)
        if (event.request.mode === 'navigate') {
           return caches.match('/index.html');
        }
      });
    })
  );
});