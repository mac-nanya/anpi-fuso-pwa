const CACHE_NAME = "anpi-fuso-v2";
const BASE_PATH = new URL(self.registration.scope).pathname;
const ASSETS = [BASE_PATH, `${BASE_PATH}manifest.webmanifest`, `${BASE_PATH}icons/icon-192.svg`, `${BASE_PATH}icons/icon-512.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("anpi-fuso-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const shell = await cache.match(BASE_PATH);
          if (shell) return shell;
        }
        return Response.error();
      }
    })(),
  );
});
