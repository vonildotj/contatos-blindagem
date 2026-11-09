const CACHE_NAME = 'blindagem-v1';
const ASSETS = [
  './',
  './index.html',
  './clientes.js',
  './manifest.json',
  './Logo Blindagem.jpeg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instala e pré-cacheia
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: network-first para navegação, cache-first para assets locais.
// Chamadas ao Worker Cloudflare NUNCA passam pelo cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API do Worker (auth) → sempre online, nunca cacheada
  if (url.hostname.includes('workers.dev')) {
    return;
  }

  // Navegações (index.html) → network-first com fallback cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais assets → cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (event.request.method === 'GET' && url.origin === location.origin) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});