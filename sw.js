/**
 * ==============================================================================
 * [sw.js] 3D 데이터 시각화 웹 플랫폼 - 서비스 워커 (PWA Service Worker)
 * ==============================================================================
 * 역할 및 기능:
 * 1. PWA(Progressive Web App) 오프라인 구동 및 정적 리소스 캐싱 관리
 * 2. 네트워크 우선(Network First) 및 오프라인 폴백(Cache Fallback) 전략 지원
 * 3. 캐시 버전 갱신 시 구버전 자동 정리 및 최신 상태 즉각 활성화(skipWaiting, clients.claim)
 * ==============================================================================
 */

// 캐시 스토리지 고유 버전명 (리소스 업데이트 시 버전 변경)
const CACHE_NAME = '3d-vis-cache-v4';

// 오프라인 상태에서도 동작할 수 있도록 사전 캐싱할 핵심 정적 자산 목록
const ASSETS_TO_CACHE = [
  './',                  // 루트 경로
  './index.html',        // 메인 HTML 마크업
  './style.css',         // 대시보드 및 3D UI 스타일시트
  './main.js',           // Three.js 엔진, 데이터 분석, UI 상호작용 메인 스크립트
  './sample_data.csv',   // 테스트용 기본 데이터
  './manifest.json',     // 웹 앱 매니페스트 (모바일 홈화면 설치 정보)
  './icon-192.png',      // 192x192 모바일 앱 아이콘
  './icon-512.png'       // 512x512 고해상도 앱 아이콘
];

/**
 * 1. install 이벤트: 서비스 워커 최초 등록/설치 시 실행
 * - 캐시 스토리지를 열고 핵심 에셋들을 모두 다운로드하여 캐시에 저장
 * - self.skipWaiting(): 대기 상태를 건너뛰고 새 서비스 워커를 즉시 활성화
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

/**
 * 2. activate 이벤트: 새 서비스 워커가 활성화될 때 실행
 * - 이전 버전(구버전)의 불필요한 캐시 스토리지를 탐색하여 일괄 삭제(정리)
 * - self.clients.claim(): 새로 로드되는 페이지뿐만 아니라 현재 열려있는 탭들도 즉시 제어
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * 3. fetch 이벤트: 브라우저가 네트워크 요청(HTTP GET 등)을 보낼 때 가로채서 처리
 * - 전략: 네트워크 우선(Network-First) 전략
 *   1) 먼저 인터넷 네트워크로 최신 리소스 요청 시도
 *   2) 응답 성공 시 최신 리소스를 캐시 스토리지에 자동 갱신 저장
 *   3) 오프라인 상태이거나 네트워크 장애 발생 시 사전에 캐싱된 로컬 자산으로 즉시 폴백 반환
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 정상적인 GET 200 응답인 경우 캐시 복사본 갱신
        if (event.request.method === 'GET' && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 연결 실패 시 캐시된 정적 리소스 반환
        return caches.match(event.request);
      })
  );
});
