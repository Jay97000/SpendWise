// Service Worker for SpendWise PWA Offline Support
const CACHE_NAME = "spendwise-v1";
const ASSETS_TO_CACHE = [
  "./",
  "index.html",
  "history.html",
  "analytics.html",
  "profile.html",
  "monthly-reports.html",
  "styles.css",
  "app.js",
  "auth.js",
  "logo-light.png",
  "logo-dark.png",
  "manifest.json"
];

// Install Event: Cache Core Static Assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup Old Caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache First with Network Fallback for Offline App Use
self.addEventListener("fetch", event => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version immediately, update cache in background if online
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback */});
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith("http")) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback for HTML pages if completely offline and uncached
      if (event.request.headers.get("accept").includes("text/html")) {
        return caches.match("index.html");
      }
    })
  );
});
