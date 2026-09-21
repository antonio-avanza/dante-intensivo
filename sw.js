// Service worker mínimo: guarda a última versão da própria página em cache
// pra abrir mesmo sem rede (offline), sem tentar cachear o Firebase/fontes externas.
var CACHE_NAME = 'dante-intensivo-v1';
var SHELL_URL = './';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.add(SHELL_URL).catch(function () { /* rede indisponível na instalação: tudo bem */ });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Network-first pra sempre pegar a versão mais recente quando há rede;
// cai pro cache (a última versão vista) só quando a rede falhar.
// Pedidos pro Firebase/Google (autenticação e dados) passam direto, sem cache.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = event.request.url;
  if (url.indexOf('googleapis.com') !== -1 || url.indexOf('gstatic.com') !== -1 || url.indexOf('firebaseio.com') !== -1) {
    return; // deixa passar direto pra rede, sem interceptar
  }
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match(SHELL_URL);
        });
      })
  );
});
