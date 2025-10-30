// Rhodes Burgers - Mostrador (PWA)
// Estrategia:
// - HTML: network-first con fallback a cache.
// - Assets estáticos: cache-first.
// - Fallback offline: pedido_local.html.

const VERSION = "rb-mostrador-v1";
const APP_SHELL = [
  "pedido_local.html",
  "manifest.json",
  "images/logo.png"
  // Agregá acá CSS/JS propios si están en archivos separados, ej:
  // "styles.css",
  // "app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === VERSION ? null : caches.delete(k))))
    )
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || (request.method === "GET" && request.headers.get("accept")?.includes("text/html"));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Navegación/HTML: network-first
  if (isNavigationRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("pedido_local.html")))
    );
    return;
  }

  // 2) Assets estáticos: cache-first
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // 3) Otros: network con fallback a cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
