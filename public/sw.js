/*
 * Service worker mínimo: cachea el app shell para poder jugar sin conexión.
 * Estrategia network-first para la navegación (así una versión nueva llega en
 * cuanto hay red) y cache-first para el resto de recursos.
 */
const CACHE = 'menterush-v1'
const SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/index.html'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        }),
    ),
  )
})
