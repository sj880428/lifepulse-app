/**
 * LifePulse 오프라인 PWA 서비스 워커 (Service Worker)
 * 인터넷이 끊기거나 비행기 모드에서도 100% 오프라인 단독 구동 지원
 */
const CACHE_NAME = 'lifepulse-v5.4.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/calendar.js',
  './js/modal.js',
  './js/wegovy.js',
  './js/meals.js',
  './js/workouts.js',
  './js/ledger.js',
  './js/charts.js',
  './js/quotes.js',
  './js/holidays.js',
  './js/calendarSync.js',
  './js/sync.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-512.png',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

// 1. 설치 시 핵심 정적 자산 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. 활성화 시 구버전 캐시 정리
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 네트워크 요청 시: 네트워크 우선, 실패(오프라인) 시 로컬 캐시에서 즉시 반환
self.addEventListener('fetch', (e) => {
  // Google API나 외부 API는 네트워크로 직접 통신
  if (e.request.url.includes('googleapis.com') || e.request.url.includes('qrserver.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // 네트워크가 살아있으면 최신 버전을 캐시에도 업데이트
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 인터넷 연결 없음 (오프라인) -> 캐시된 로컬 파일 제공
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (e.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
