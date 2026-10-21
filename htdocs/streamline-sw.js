/* Streamline PWA: dynamic LuCI and RPC requests are deliberately never cached. */
'use strict';

const CACHE = 'streamline-static-v42';
const STATIC_ASSETS = [
  '/luci-static/streamline/cascade.css',
  '/luci-static/streamline/mobile.css',
  '/luci-static/streamline/dashboard.js',
  '/luci-static/streamline/logo.svg',
  '/luci-static/streamline/logo-glinet.svg',
  '/luci-static/streamline/icon-192.png',
  '/luci-static/streamline/icon-512.png',
  '/luci-static/streamline/manifest.json',
  '/luci-static/streamline/login-bg.jpg',
  '/streamline-offline.html'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(STATIC_ASSETS);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key.indexOf('streamline-static-') === 0 && key !== CACHE;
    }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin)
    return;

  if (url.pathname.indexOf('/luci-static/streamline/') === 0) {
    event.respondWith(caches.match(request).then(function (cached) {
      return cached || fetch(request).then(function (response) {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    }));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(function () {
      return caches.match('/streamline-offline.html');
    }));
  }
});
