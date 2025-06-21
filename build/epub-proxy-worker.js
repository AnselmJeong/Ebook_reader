// ✅ 간단하고 안정적한 EPUB 프록시 ServiceWorker
console.log('📡 EPUB ServiceWorker v3 시작');

// 간단한 메모리 캐시
const epubCache = new Map();

// ServiceWorker 설치
self.addEventListener('install', () => {
  console.log('📥 ServiceWorker 설치');
  self.skipWaiting();
});

// ServiceWorker 활성화
self.addEventListener('activate', () => {
  console.log('🚀 ServiceWorker 활성화');
  self.clients.claim();
});

// 메시지 처리 - EPUB 데이터 캐싱
self.addEventListener('message', (event) => {
  const { type, data, bookId } = event.data;
  
  if (type === 'CACHE_EPUB') {
    try {
      console.log('📦 EPUB 캐싱 시작:', bookId, data?.byteLength || 0, 'bytes');
      
      if (!bookId || !data) {
        throw new Error('잘못된 요청 데이터');
      }
      
      // ArrayBuffer를 Uint8Array로 변환하여 저장
      epubCache.set(bookId, {
        data: new Uint8Array(data),
        timestamp: Date.now()
      });
      
      console.log('✅ EPUB 캐싱 완료:', bookId);
      event.ports[0].postMessage({ success: true });
      
    } catch (error) {
      console.error('❌ EPUB 캐싱 실패:', error);
      event.ports[0].postMessage({ 
        success: false, 
        error: error.message 
      });
    }
  }
});

// HTTP 요청 가로채기
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/epub-proxy/')) {
    event.respondWith(handleEpubRequest(event.request, url));
  }
});

// EPUB 요청 처리
async function handleEpubRequest(request, url) {
  try {
    // bookId 추출
    const fileName = url.pathname.split('/').pop();
    const bookId = fileName.replace('.epub', '');
    
    console.log('📖 EPUB 요청:', bookId, request.method);
    
    // 캐시에서 찾기
    const cached = epubCache.get(bookId);
    if (!cached) {
      console.error('❌ 캐시에 없음:', bookId);
      return new Response('EPUB not found in cache', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // HEAD 요청 처리
    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Length': cached.data.byteLength.toString(),
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // GET 요청 처리
    if (request.method === 'GET') {
      return new Response(cached.data, {
        status: 200,
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Length': cached.data.byteLength.toString(),
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    console.error('❌ EPUB 요청 처리 실패:', error);
    return new Response(`Server error: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
} 