const CACHE_NAME = 'uni-portal-v1';
const OFFLINE_URL = '/portal/offline.html';
const STATIC_ASSETS = [
  '/portal/index.html',
  '/portal/akis.html',
  '/portal/offline.html',
  '/portal/portal-core.js',
  '/portal/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  // HTML istekleri: Network-First, başarısızsa Cache -> offline.html
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Statik assetler: Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

// Firebase Cloud Messaging Background Handler
try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-sw.js');

  firebase.initializeApp({
    // Firebase Console -> Proje Ayarları -> Genel bölümünden alınan public config:
    apiKey: "BURAYA_DOLDUR",
    authDomain: "lianchezportal.firebaseapp.com",
    projectId: "lianchezportal",
    storageBucket: "lianchezportal.firebasestorage.app",
    messagingSenderId: "283567832811",
    appId: "1:283567832811:web:cff0981ba1fa305a0dc8ae"
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = payload?.notification?.title || payload?.data?.title || 'Üni Portal Bildirimi';
    const options = {
      body: payload?.notification?.body || payload?.data?.body || 'Yeni bir bildiriminiz var.',
      icon: '/portal/fav.png',
      badge: '/portal/fav.png',
      data: {
        link: payload?.data?.link || payload?.fcmOptions?.link || '/portal/index.html'
      }
    };
    self.registration.showNotification(title, options);
  });
} catch (err) {
  // FCM başlatılamazsa çevrimdışı önbellek çalışmaya devam eder
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.link || '/portal/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
