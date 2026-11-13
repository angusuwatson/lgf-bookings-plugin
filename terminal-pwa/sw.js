var CACHE = 'lgf-terminal-v4';
var APP_PATH = new URL(self.registration.scope).pathname;
var APP_INDEX_PATH = APP_PATH + 'index.html';
var SHELL = ['manifest.json', 'icon-152.png', 'icon-167.png', 'icon-180.png', 'icon-512.png'].map(function(path) {
  return APP_PATH + path;
});

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(k) {
          if (k !== CACHE) return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.indexOf('/wp-json/') >= 0) return;
  if (url.pathname === APP_PATH || url.pathname === APP_INDEX_PATH) {
    // Network-first: index.html must update so new app builds are picked up.
    // Fall back to the cached shell only when offline.
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.ok && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }
  if (SHELL.indexOf(url.pathname) >= 0) {
    e.respondWith(caches.match(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        if (resp && resp.ok && resp.type === 'basic') {
          var clone = resp.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
