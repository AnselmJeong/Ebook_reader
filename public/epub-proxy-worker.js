// EPUB Proxy ServiceWorker
// Blob URL을 HTTP URL처럼 처리하도록 도와주는 워커

const EPUB_CACHE_NAME = 'epub-proxy-cache';
let cachedEpubData = null;
let cachedEpubId = null;

self.addEventListener('install', (event) => {
  // console.log('📡 EPUB Proxy Worker 설치됨');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // console.log('📡 EPUB Proxy Worker 활성화됨');
  event.waitUntil(self.clients.claim());
});

// 메인 스레드에서 EPUB 데이터 받기
self.addEventListener('message', (event) => {
  const { type, data, bookId } = event.data;
  
  if (type === 'CACHE_EPUB') {
    // console.log('📦 EPUB 데이터 캐싱:', bookId, data.byteLength, 'bytes');
    cachedEpubData = data;
    cachedEpubId = bookId;
    
    // 응답 전송
    event.ports[0].postMessage({ success: true });
  }
});

// HTTP 요청 가로채기
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // /epub-proxy/ 경로로 요청이 오면 캐시된 EPUB 데이터 반환
  if (url.pathname.startsWith('/epub-proxy/')) {
    event.respondWith(handleEpubRequest(event.request));
  }
});

async function handleEpubRequest(request) {
  try {
    // console.log('🎯 EPUB 프록시 요청:', request.url);
    
    if (!cachedEpubData) {
      console.error('❌ 캐시된 EPUB 데이터 없음');
      return new Response('EPUB data not found', { status: 404 });
    }
    
    // EPUB 파일 반환
    return new Response(cachedEpubData, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Length': cachedEpubData.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    console.error('❌ EPUB 프록시 오류:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 