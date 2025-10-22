const CACHE_NAME = 'pulsebeta-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];
self.addEventListener('install', ev=>{ ev.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', ev=>{ ev.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', ev=>{ ev.respondWith(caches.match(ev.request).then(res=>res||fetch(ev.request))); });