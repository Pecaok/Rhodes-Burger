const STATIC_CACHE = 'rb-static-v1';
const ASSETS = [
  '/', '/index.html', '/login.html', '/pedido_local.html', '/finanzas.html',
  '/images/logo.png', '/images/icon-192.png', '/images/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Sólo para tu propio dominio
  if (url.origin !== location.origin) return;

  // HTML => network-first
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(STATIC_CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Otros => cache-first
  e.respondWith(
    caches.match(e.request).then(r =>
      r || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(e.request, copy));
        return res;
      })
    )
  );
});
