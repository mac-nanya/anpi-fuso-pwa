const CACHE_NAME = "anpi-fuso-v1";
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match(BASE_PATH))),
  );
});
