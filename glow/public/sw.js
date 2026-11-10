// GLOW service worker: works offline and shows notifications.
const CACHE = 'glow-v1';
const FILES = ['/', '/index.html', '/app.css', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png',
  '/js/app.js', '/js/store.js', '/js/ui.js', '/js/calc.js', '/js/schedule.js', '/js/defaults.js',
  '/js/views/today.js', '/js/views/program.js', '/js/views/beden.js', '/js/views/ben.js', '/js/views/alanlar.js', '/js/views/alanlar2.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

// app files: network first (so updates arrive), cache when offline. API: never cached.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html'))));
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'GLOW', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'GLOW', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url || '/#bugun' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/#bugun';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
