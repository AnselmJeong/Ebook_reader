import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { ReactReader } from 'react-reader';
import { FiRefreshCw, FiAlertCircle, FiMessageCircle, FiEdit3 } from 'react-icons/fi';
import styled from 'styled-components';
import { EpubAnalyzer } from '../../utils/EpubAnalyzer';
import { useChat } from '../../context/ChatContext';
import { useHighlights } from '../../context/HighlightContext';

// 컨텍스트 메뉴 스타일드 컴포넌트
const ContextMenu = styled.div`
  position: fixed;
  background: ${props => props.theme === 'dark' ? '#2a2a2a' : '#ffffff'};
  border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#e0e0e0'};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 1000;
  min-width: 180px;
`;

const ContextMenuItem = styled.button`
  width: 100%;
  padding: 10px 12px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.9rem;
  color: ${props => props.theme === 'dark' ? '#e0e0e0' : '#333'};
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: ${props => props.theme === 'dark' ? '#3a3a3a' : '#f8f9fa'};
  }
`;

const HighlightSubmenu = styled.div`
  position: absolute;
  top: 0;
  left: 100%;
  background: ${props => props.theme === 'dark' ? '#2a2a2a' : '#ffffff'};
  border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#e0e0e0'};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 120px;
  z-index: 1001;
`;

const HighlightColorOption = styled.button`
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: ${props => props.theme === 'dark' ? '#3a3a3a' : '#f8f9fa'};
  }
`;

const HighlightColorCircle = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => props.color};
  border: 2px solid ${props => props.theme === 'dark' ? '#555' : '#ddd'};
`;

const ReactReaderRenderer = forwardRef(({ 
  book, 
  settings, 
  currentPage, 
  onPageChange, 
  onTotalPagesChange,
  onChaptersChange,
  onTextSelection,
  onError,
  onLocationChange,
  onPageChangeInternal,
  initialLocation,
  totalPages,
  bookChapters
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(0);
  const [bookUrl, setBookUrl] = useState(null);
  const [finalUrl, setFinalUrl] = useState(null);
  const [readerTimeout, setReaderTimeout] = useState(null);
  const renditionRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);
  const [showHighlightSubmenu, setShowHighlightSubmenu] = useState(false);

  // AI 채팅 훅
  const { startChat } = useChat();
  
  // Highlight 훅
  const { addHighlight, getHighlightsByPage, getHighlights } = useHighlights();
  
  // 하이라이트 색상 옵션 (파스텔 톤)
  const highlightColors = [
    { name: '노랑', color: '#fff9c4', className: 'highlight-yellow' },
    { name: '초록', color: '#c8e6c9', className: 'highlight-green' },
    { name: '파랑', color: '#bbdefb', className: 'highlight-blue' },
    { name: '분홍', color: '#f8bbd9', className: 'highlight-pink' },
    { name: '보라', color: '#e1bee7', className: 'highlight-purple' }
  ];

  // 설정 적용 함수 - 직접 iframe 조작
  const applySettings = useCallback((rendition, currentSettings) => {
    if (isUnmountingRef.current) {
      console.log('❌ applySettings 중단: unmount 상태');
      return;
    }
    
    try {
      console.log('🚀 설정 적용 시작:', currentSettings);
      
      const fontSize = currentSettings?.fontSize || 20;
      const lineHeight = currentSettings?.lineHeight || 1.8;
      const fontFamily = currentSettings?.fontFamily || 'serif';
      const theme = currentSettings?.theme || 'light';
      
      // 폰트 패밀리 매핑
      const fontFamilyMap = {
        'serif': 'Georgia, serif',
        'sans-serif': '-apple-system, BlinkMacSystemFont, sans-serif',
        'monospace': '"Courier New", monospace'
      };
      const fontFamilyCSS = fontFamilyMap[fontFamily] || fontFamily;
      
      // 직접 iframe 조작 (확실한 방법)
      const iframe = document.querySelector('#react-reader iframe') || 
                    document.querySelector('iframe[src*="blob:"]') ||
                    document.querySelector('iframe');
      
      if (iframe && iframe.contentDocument) {
        const doc = iframe.contentDocument;
        const body = doc.body;
        
        if (body) {
          // 기본 스타일 적용
          body.style.fontSize = `${fontSize}px`;
          body.style.lineHeight = `${lineHeight}`;
          body.style.fontFamily = fontFamilyCSS;
          
          // 모든 텍스트 요소에 적용
          const textElements = doc.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6, li, td, th');
          textElements.forEach(element => {
            element.style.fontSize = `${fontSize}px`;
            element.style.lineHeight = `${lineHeight}`;
            element.style.fontFamily = fontFamilyCSS;
          });
          
          // 테마 적용
          if (theme === 'dark') {
            body.style.color = '#e0e0e0';
            body.style.backgroundColor = '#1a1a1a';
          } else if (theme === 'sepia') {
            body.style.color = '#5c4b37';
            body.style.backgroundColor = '#f4f1ea';
          } else {
            body.style.color = '#333333';
            body.style.backgroundColor = '#ffffff';
          }
          
          console.log(`✅ 직접 설정 적용 완료: ${fontSize}px, 줄간격 ${lineHeight}, 폰트 ${fontFamily}`);
        } else {
          console.warn('⚠️ iframe body를 찾을 수 없음');
        }
      } else {
        console.warn('⚠️ iframe 또는 contentDocument를 찾을 수 없음');
      }
      
      // 추가로 themes API도 시도 (있다면)
      if (rendition && rendition.themes) {
        try {
          rendition.themes.fontSize(`${fontSize}px`);
          rendition.themes.font(fontFamilyCSS);
          console.log('📝 themes API도 함께 적용');
        } catch (themesError) {
          console.warn('⚠️ themes API 적용 실패:', themesError);
        }
      }
      
    } catch (error) {
      console.error('❌ 설정 적용 실패:', error);
    }
  }, []);

  // cleanup을 위한 ref들
  const cleanupRef = useRef(null);
  const isUnmountingRef = useRef(false);

  // 즉시 적용 - settings가 변경되면 바로 적용 (공식 방식)
  useEffect(() => {
    console.log('🔍 ReactReaderRenderer 설정 변경 감지:', settings);
    console.log('🔍 renditionRef 상태:', !!renditionRef.current);
    
    if (renditionRef.current && settings && !isUnmountingRef.current) {
      console.log('⚡ 즉시 설정 적용:', settings);
      applySettings(renditionRef.current, settings);
    }
  }, [settings, applySettings]);

  // 중복 제거 - 즉시 적용만 사용

  // 컴포넌트 unmount 시 cleanup
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
      
      // 모든 timeout 정리
      if (readerTimeout) {
        clearTimeout(readerTimeout);
      }
      
      // rendition 안전하게 정리
      if (renditionRef) {
        try {
          if (renditionRef.off) {
            renditionRef.off('relocated');
            renditionRef.off('resized');
            renditionRef.off('rendered');
            renditionRef.off('error');
          }
        } catch (renditionCleanupError) {
          console.warn('⚠️ rendition cleanup 오류:', renditionCleanupError);
        }
      }
      
      // cleanup 함수 실행
      if (cleanupRef.current) {
        try {
          cleanupRef.current();
        } catch (cleanupError) {
          console.warn('⚠️ cleanup 중 오류:', cleanupError);
        }
      }
    };
  }, [readerTimeout, renditionRef]);

  // 외부 클릭으로 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClick = (e) => {
      // 컨텍스트 메뉴 밖을 클릭하면 메뉴 닫기
      if (contextMenu && !e.target.closest('[data-context-menu]')) {
        setContextMenu(null);
        setShowHighlightSubmenu(false);
      }
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu]);

  // 컴포넌트 마운트 시 전역 에러 핸들러 추가
  useEffect(() => {
    const handleUnhandledError = (event) => {
      if (event.error?.message?.includes('package') || 
          event.error?.message?.includes('Cannot read properties of undefined')) {
        console.error('📦 전역 EPUB 파싱 에러 감지:', event.error);
        event.preventDefault();
        if (onError) {
          onError(new Error('전역 EPUB 파싱 에러 - SimpleRenderer로 전환'));
        }
      }
    };

    window.addEventListener('error', handleUnhandledError);
    
    return () => {
      window.removeEventListener('error', handleUnhandledError);
    };
  }, [onError]);

  // initialLocation 변경 감지 및 로깅
  useEffect(() => {
    console.log('📍 ReactReaderRenderer initialLocation 변경:', initialLocation);
    if (initialLocation) {
      console.log('🔖 북마크 위치로 시작:', initialLocation);
    } else {
      console.log('📖 처음부터 시작 (북마크 없음)');
    }
  }, [initialLocation]);

  // 책 파일을 URL로 변환 - 간단한 Blob URL 방식
  useEffect(() => {
    if (!book) return;

    let cleanup;

    const createBookUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔍 EPUB 분석 먼저 실행
        console.log('🔍 EPUB 분석 시작...');
        const analysis = await EpubAnalyzer.analyzeEpub(book.fileData);
        
        console.log('📊 EPUB 분석 결과:', {
          isValid: analysis.isValid,
          errors: analysis.errors,
          warnings: analysis.warnings,
          hasContainer: analysis.hasContainer,
          hasOPF: analysis.hasOPF
        });
        
        if (!analysis.isValid) {
          throw new Error(`EPUB 파일에 문제가 있습니다:\n${analysis.errors.join('\n')}`);
        }
        
        if (analysis.warnings.length > 0) {
          console.warn('⚠️ EPUB 경고사항:', analysis.warnings);
        }

        let fileData;
        
        // 파일 데이터 확인 및 변환
        if (book.file instanceof File) {
          fileData = book.file;
        } else if (book.fileData instanceof ArrayBuffer) {
          fileData = new Blob([book.fileData], { type: 'application/epub+zip' });
        } else if (book.fileData instanceof Uint8Array) {
          fileData = new Blob([book.fileData], { type: 'application/epub+zip' });
        } else if (typeof book.fileData === 'string') {
          // 레거시: 기존에 base64로 저장된 파일들 처리
          try {
            const base64Data = book.fileData.replace(/^data:.*,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            fileData = new Blob([bytes], { type: 'application/epub+zip' });
          } catch (stringError) {
            console.error('❌ 레거시 변환 실패:', stringError);
            throw new Error('레거시 파일 데이터를 변환할 수 없습니다.');
          }
        } else if (book.content) {
          // 레거시: content 필드 사용
          throw new Error('레거시 content 형식은 지원되지 않습니다. 파일을 다시 업로드해주세요.');
        } else {
          throw new Error('지원되는 파일 데이터 형식을 찾을 수 없습니다.');
        }

        // ServiceWorker 방식으로 다시 시도
        console.log('📁 파일 정보:', {
          type: fileData.type,
          size: fileData.size,
          constructor: fileData.constructor.name
        });

        // ArrayBuffer 확보
        let arrayBuffer;
        if (fileData instanceof Blob) {
          arrayBuffer = await fileData.arrayBuffer();
        } else if (fileData instanceof ArrayBuffer) {
          arrayBuffer = fileData;
        } else {
          throw new Error('지원되지 않는 파일 형식');
        }
        
        console.log('📦 ArrayBuffer 준비:', arrayBuffer.byteLength, 'bytes');

        // ServiceWorker 등록 및 사용
        try {
          if ('serviceWorker' in navigator) {
            let registration = await navigator.serviceWorker.getRegistration('/epub-proxy-worker.js');
            
            if (!registration) {
              console.log('📡 ServiceWorker 등록 시작...');
              registration = await navigator.serviceWorker.register('/epub-proxy-worker.js');
            }
            
            await navigator.serviceWorker.ready;
            console.log('✅ ServiceWorker 준비 완료');

            // ServiceWorker에 EPUB 데이터 전송
            const channel = new MessageChannel();
            const promise = new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('ServiceWorker 통신 타임아웃'));
              }, 10000); // 10초로 늘림

              channel.port1.onmessage = (event) => {
                clearTimeout(timeout);
                if (event.data.success) {
                  resolve(true);
                } else {
                  reject(new Error('ServiceWorker 데이터 캐싱 실패'));
                }
              };
            });

            navigator.serviceWorker.controller.postMessage({
              type: 'CACHE_EPUB',
              data: arrayBuffer,
              bookId: book.id
            }, [channel.port2]);

            await promise;

            // 프록시 URL 생성
            const proxyUrl = `/epub-proxy/${book.id}.epub`;
            console.log('✅ ServiceWorker 프록시 URL 생성:', proxyUrl);
            
            // URL 테스트
            try {
              const testResponse = await fetch(proxyUrl, { method: 'HEAD' });
              console.log('🔍 프록시 URL 테스트 성공:', testResponse.status);
            } catch (testError) {
              console.warn('⚠️ 프록시 URL 테스트 실패:', testError);
            }
            
            setBookUrl(proxyUrl);
            setFinalUrl(proxyUrl);
            setLoading(false);

            // cleanup 함수
            cleanup = () => {
              console.log('🧹 ServiceWorker 정리 (필요시)');
            };

          } else {
            throw new Error('ServiceWorker를 지원하지 않는 브라우저');
          }
          
        } catch (swError) {
          console.warn('⚠️ ServiceWorker 실패, Blob URL로 폴백:', swError);
          
          // Blob URL 폴백
          const blobUrl = URL.createObjectURL(fileData);
          console.log('✅ Blob URL 폴백:', blobUrl);
          setBookUrl(blobUrl);
          setFinalUrl(blobUrl);
          setLoading(false);

          cleanup = () => {
            URL.revokeObjectURL(blobUrl);
            console.log('🧹 Blob URL 정리 완료');
          };
        }

      } catch (error) {
        console.error('❌ 책 URL 생성 실패:', error);
        setError(`파일 로드 실패: ${error.message}`);
        setLoading(false);
      }
    };

    createBookUrl();

    // cleanup 함수 반환
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [book]);

  // CFI 기반 위치 변경 핸들러 (useCallback으로 메모이제이션)
  const handleLocationChanged = useCallback((epubcfi) => {
    setLocation(epubcfi);
    
    // 부모 컴포넌트에 CFI 정보와 함께 위치 변경 알림 (북마크 저장용)
    if (onLocationChange && renditionRef.current?.location) {
      try {
        const currentLocation = renditionRef.current.location;
        const currentBook = renditionRef.current.book;
        
        // CFI와 진행률 정보 추출
        const locationData = {
          // 위치 정보 (CFI 포함)
          location: {
            start: {
              cfi: currentLocation.start?.cfi || epubcfi,
              href: currentLocation.start?.href,
              index: currentLocation.start?.index,
              percentage: currentLocation.start?.percentage || 0
            },
            end: currentLocation.end ? {
              cfi: currentLocation.end.cfi,
              href: currentLocation.end.href,
              index: currentLocation.end.index,
              percentage: currentLocation.end.percentage || 0
            } : null
          },
          
          // 챕터 정보
          href: currentLocation.start?.href,
          title: currentBook?.navigation?.toc?.find(
            item => item.href === currentLocation.start?.href
          )?.label || null,
          
          // 진행률 정보
          progress: currentLocation.start?.percentage || 0,
          
          // 원본 CFI 문자열
          cfi: currentLocation.start?.cfi || epubcfi
        };
        
        console.log('📍 CFI 위치 변경:', {
          cfi: locationData.cfi,
          progress: `${Math.round(locationData.progress * 100)}%`,
          chapter: locationData.title
        });
        
        onLocationChange(locationData);
      } catch (locationError) {
        console.warn('⚠️ CFI 위치 정보 추출 실패:', locationError);
        // 폴백: 기본 정보만 전달
        onLocationChange({
          location: { start: { cfi: epubcfi, percentage: 0 } },
          cfi: epubcfi,
          progress: 0
        });
      }
    }
    
    // 페이지 번호 계산 및 알림 (CFI 기반)
    if (onPageChangeInternal && renditionRef.current?.location) {
      try {
        const currentLocation = renditionRef.current.location;
        if (currentLocation.start) {
          // CFI 기반으로 진행률 계산
          const progress = currentLocation.start.percentage || 0;
          console.log('📊 CFI 기반 현재 진행률:', `${Math.round(progress * 100)}%`);
          
          // 진행률을 기반으로 페이지 번호 계산 (1-100 범위)
          const estimatedPage = Math.max(1, Math.round(progress * 100));
          console.log('📄 CFI 기반 계산된 페이지:', `${estimatedPage}/100`);
          
          onPageChangeInternal(estimatedPage);
        }
      } catch (pageError) {
        console.warn('⚠️ CFI 기반 페이지 번호 계산 실패:', pageError);
      }
    }
  }, [onLocationChange, onPageChangeInternal]);

  // 챕터 이동 함수 (useCallback으로 메모이제이션)
  const goToChapter = useCallback((chapterHref) => {
    if (renditionRef.current && chapterHref) {
              // Book 객체에서 spine 정보 확인
        if (renditionRef.current.book && renditionRef.current.book.spine) {
          const spine = renditionRef.current.book.spine;
          const fileName = chapterHref.split('#')[0];
        
        // Spine에서 해당 파일 찾기
        const spineItem = spine.spineItems.find(item => 
          item.href === fileName || 
          item.href === chapterHref ||
          item.href.endsWith(fileName) ||
          item.id === fileName.replace('.xhtml', '')
        );
        
        if (spineItem) {
          
          // Spine 인덱스로 이동 시도
          const trySpineMethods = [
            // 1. 인덱스로 이동
            () => renditionRef.current.display(spineItem.index),
            // 2. spine item의 href로 이동
            () => renditionRef.current.display(spineItem.href),
            // 3. spine item을 직접 전달
            () => renditionRef.current.display(spineItem),
            // 4. CFI 생성하여 이동
            () => {
              const cfi = spine.cfiFromElement(spineItem);
              return renditionRef.current.display(cfi);
            }
          ];
          
          const trySpineNext = (index) => {
            if (index >= trySpineMethods.length) {
              console.error('❌ 모든 spine 방법 실패:', chapterHref);
              return;
            }

            trySpineMethods[index]()
              .then(() => {
                // 이동 성공
              })
              .catch(error => {
                console.warn(`⚠️ Spine 방법 ${index + 1} 실패:`, error.message);
                trySpineNext(index + 1);
              });
          };

          trySpineNext(0);
          return;
        } else {
          console.warn('⚠️ Spine에서 파일을 찾을 수 없음:', fileName);
        }
      }

      // 기존 방법들 (폴백)
      const tryDisplayMethods = [
        () => renditionRef.current.display(chapterHref),
        () => renditionRef.current.display(chapterHref.split('#')[0]),
        () => renditionRef.current.display(`/${chapterHref}`),
      ];

      const tryNext = (index) => {
        if (index >= tryDisplayMethods.length) {
          console.error('❌ 모든 방법 실패:', chapterHref);
          return;
        }

        tryDisplayMethods[index]()
          .then(() => {
            // 이동 성공
          })
          .catch(error => {
            console.warn(`⚠️ 기본 방법 ${index + 1} 실패:`, error.message);
            tryNext(index + 1);
          });
      };

      tryNext(0);
    } else {
      console.warn('⚠️ 렌디션 또는 챕터 정보 없음:', { renditionRef: !!renditionRef.current, chapterHref });
    }
  }, []);

  // 위치 이동 함수 (북마크 기능용)
  const goToLocation = useCallback((location) => {
    if (renditionRef.current && location) {
      try {
        console.log('🔖 위치로 이동:', location);
        renditionRef.current.display(location);
        return true;
      } catch (error) {
        console.error('❌ 위치 이동 실패:', error);
        return false;
      }
    }
    return false;
  }, []);

  // 부모 컴포넌트에서 챕터 이동 함수에 접근할 수 있도록 노출
  useImperativeHandle(ref, () => ({
    goToChapter,
    goToLocation
  }), [goToChapter, goToLocation]);

  // 목차 변경 핸들러 (useCallback으로 메모이제이션) - 무한 루프 방지를 위해 ref 사용
  const lastTocRef = useRef(null);
  const onChaptersChangeRef = useRef(onChaptersChange);
  
  // onChaptersChange 최신 참조 유지
  useEffect(() => {
    onChaptersChangeRef.current = onChaptersChange;
  }, [onChaptersChange]);
  
  const handleTocChanged = useCallback((tocArray) => {
    // 목차가 실제로 변경되었는지 확인 (무한 루프 방지)
    const tocString = JSON.stringify(tocArray);
    if (lastTocRef.current === tocString) {
      return;
    }
    
    lastTocRef.current = tocString;
    
    // 목차를 상위 컴포넌트에 전달 (ReaderView의 onChaptersChange)
    if (onChaptersChangeRef.current && tocArray && tocArray.length > 0) {
      // react-reader의 TOC 형식을 우리 형식으로 변환
      const formattedChapters = tocArray.map((item, index) => ({
        title: item.label || item.title || `Chapter ${index + 1}`,
        href: item.href || '',
        id: item.id || `chapter-${index}`,
        subitems: item.subitems || []
      }));
      
      onChaptersChangeRef.current(formattedChapters);
    }
  }, []); // 의존성 배열 제거하여 함수 재생성 방지

  // 폴백 핸들러  
  const handleFallback = () => {
    if (onError) {
      onError(new Error('사용자가 SimpleEpubRenderer로 변경을 요청했습니다.'));
    }
  };

  // 커스텀 로딩 뷰
  const customLoadingView = (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
      background: 'white'
    }}>
      <FiRefreshCw size={40} style={{ animation: 'spin 1s linear infinite' }} />
      <h3>📚 EPUB 파일 로딩 중...</h3>
      <p>react-reader가 책을 파싱하고 있습니다.</p>
      <button 
        onClick={handleFallback}
        style={{
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '6px',
          background: 'white',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        기본 리더로 전환
      </button>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (loading) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <FiRefreshCw size={40} style={{ animation: 'spin 1s linear infinite' }} />
        <h3>📁 파일 준비 중...</h3>
        <p>Blob URL을 생성하고 있습니다.</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <FiAlertCircle size={60} color="#ff6b6b" />
        <h3>🚨 React Reader 로드 실패</h3>
        <p>{error}</p>
        <button onClick={handleFallback} style={{
          padding: '10px 20px',
          border: '1px solid #ccc',
          borderRadius: '6px',
          background: 'white',
          cursor: 'pointer'
        }}>
          기본 리더 사용
        </button>
      </div>
    );
  }

  if (!bookUrl) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <p>책 URL 준비 중...</p>
      </div>
    );
  }

  // 로딩 중이면 아직 렌더링하지 않음
  if (loading || !finalUrl) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666'
      }}>
        <div>
          <div>📚 EPUB 파일 로드 중...</div>
          <div style={{ fontSize: '0.9em', marginTop: '8px' }}>
            ServiceWorker 프록시 설정 중
          </div>
        </div>
      </div>
    );
  }

  // react-reader 에러 핸들링
  const handleReaderError = (error) => {
    console.error('🚨 ReactReader 내부 에러:', error);
    setError(`ReactReader 오류: ${error.message || error}`);
  };

  // 렌디션 접근 및 에러 핸들링
  const handleGetRendition = (rendition) => {
    console.log('🎯 handleGetRendition 호출됨:', !!rendition);
    
    // unmount 상태라면 처리하지 않음
    if (isUnmountingRef.current) {
      console.log('❌ 컴포넌트가 unmount 상태');
      return;
    }
    
    try {
      // 렌디션 유효성 검사
      if (!rendition) {
        throw new Error('렌디션이 유효하지 않습니다');
      }
      
      // 렌디션 참조 저장 (ref 방식)
      renditionRef.current = rendition;
      
      // 타임아웃 클리어 (성공적으로 렌디션이 생성됨)
      if (readerTimeout) {
        clearTimeout(readerTimeout);
        setReaderTimeout(null);
      }
      
      // cleanup 함수 등록
      cleanupRef.current = () => {
        try {
          if (rendition && typeof rendition === 'object' && !isUnmountingRef.current) {
            // 안전하게 이벤트 리스너들 제거
            if (rendition.off && typeof rendition.off === 'function') {
              try {
                rendition.off('rendered');
                rendition.off('relocated'); 
                rendition.off('resized');
                rendition.off('error');
              } catch (offError) {
                console.warn('⚠️ 이벤트 리스너 제거 중 오류:', offError);
              }
            }
          }
        } catch (cleanupError) {
          console.warn('⚠️ 렌디션 cleanup 중 오류 (무시됨):', cleanupError);
        }
      };
      
    } catch (validationError) {
      console.error('❌ 렌디션 유효성 검사 실패:', validationError);
      setError(`EPUB 렌더링 초기화 실패: ${validationError.message}`);
      return;
    }
    
    // 즉시 설정 적용 - 깜빡임 방지를 위해 강력하게 적용
    console.log('🎯 렌디션 생성됨 - 깜빡임 방지 설정 적용');
    
    if (rendition.themes && settings) {
      const fontSize = settings?.fontSize || 20;
      const lineHeight = settings?.lineHeight || 1.8;
      const fontFamily = settings?.fontFamily || 'serif';
      
      const fontFamilyMap = {
        'serif': 'Georgia, serif',
        'sans-serif': '-apple-system, BlinkMacSystemFont, sans-serif',
        'monospace': '"Courier New", monospace'
      };
      const fontFamilyCSS = fontFamilyMap[fontFamily] || fontFamily;
      
      console.log(`📝 깜빡임 방지 설정 적용: ${fontSize}px`);
      
      // 기본 스타일을 미리 강력하게 설정 (깜빡임 방지)
      rendition.themes.fontSize(`${fontSize}px`);
      rendition.themes.font(fontFamilyCSS);
      
      // 모든 요소에 미리 스타일 적용 (렌더링 전에)
      const strongStyle = `
        font-size: ${fontSize}px !important;
        line-height: ${lineHeight} !important;
        font-family: ${fontFamilyCSS} !important;
      `;
      
      // 전체 문서에 기본 스타일 적용
      rendition.themes.override('*', strongStyle);
      rendition.themes.override('body', strongStyle);
      rendition.themes.override('p', strongStyle);
      rendition.themes.override('div', strongStyle);
      rendition.themes.override('span', strongStyle);
      rendition.themes.override('h1, h2, h3, h4, h5, h6', strongStyle);
      rendition.themes.override('li', strongStyle);
      
      // 기본 epub.js 스타일을 무력화
      rendition.themes.override('html', strongStyle);
      
      console.log(`✅ 깜빡임 방지 설정 완료: ${fontSize}px, 줄간격 ${lineHeight}`);
    }
    
    // 추가로 우리 함수도 호출
    applySettings(rendition, settings);
    
          // book이 준비되었을 때 추가 설정 적용 및 북마크 위치로 이동
      if (rendition && rendition.book) {
        rendition.book.ready.then(() => {
          if (isUnmountingRef.current) return;
          
          console.log('📖 EPUB book 준비됨 - 설정 재적용');
          // 책이 로드된 후 설정 재적용
          applySettings(rendition, settings);
          
          // location prop으로 초기 위치가 설정되므로 별도 이동 불필요
          console.log('📍 초기 위치는 location prop으로 설정됨:', initialLocation);
          
        }).catch((err) => {
          console.error('❌ EPUB 책 로드 실패:', err);
          handleReaderError(err);
        });

      // 안전한 이벤트 리스너 추가
      try {
        rendition.on('rendered', () => {
          if (isUnmountingRef.current) return;
          
          // 성공적으로 렌더링되었으므로 타임아웃 취소
          if (readerTimeout) {
            clearTimeout(readerTimeout);
            setReaderTimeout(null);
          }
          
          // 렌더링 완료 후 iframe 내부에 텍스트 선택 이벤트 추가
          addTextSelectionEvents(rendition);
          
          // 렌더링 후 즉시 설정 재적용 (깜빡임 방지)
          if (!isUnmountingRef.current && rendition && settings) {
            console.log('🔄 페이지 렌더링 후 즉시 설정 재적용');
            applySettings(rendition, settings);
          }
          
          // 추가 보험용 재적용 및 하이라이트 복원
          setTimeout(() => {
            if (!isUnmountingRef.current && rendition && settings) {
              applySettings(rendition, settings);
              // 하이라이트 복원
              restoreHighlights();
            }
          }, 100); // 하이라이트 복원을 위해 시간을 조금 늘림
        });

        // 페이지 변경 시 즉시 설정 재적용 (깜빡임 방지)
        rendition.on('relocated', () => {
          if (isUnmountingRef.current) return;
          
          console.log('📍 페이지 이동 - 즉시 설정 재적용');
          
          // 즉시 적용 (지연 없음)
          if (rendition && settings) {
            applySettings(rendition, settings);
          }
          
          // 추가 보험용 재적용 및 하이라이트 복원 (미세한 지연)
          setTimeout(() => {
            if (!isUnmountingRef.current && rendition && settings) {
              applySettings(rendition, settings);
              // 페이지 이동 시 하이라이트 복원
              restoreHighlights();
            }
          }, 100); // 하이라이트 복원을 위해 시간을 조금 늘림
        });

        rendition.on('resized', () => {
          if (isUnmountingRef.current) return;
          
          console.log('📏 레이아웃 변경 - 설정 재적용');
          
          // 레이아웃 변경 후 설정 재적용
          setTimeout(() => {
            if (!isUnmountingRef.current && rendition && settings) {
              applySettings(rendition, settings);
            }
          }, 100);
        });

        rendition.on('error', (err) => {
          console.error('❌ 렌디션 에러:', err);
          console.error('❌ 렌디션 에러 세부정보:', {
            message: err?.message,
            name: err?.name,
            stack: err?.stack
          });
          
          // package 관련 오류들 포괄적으로 확인
          if (err?.message && (
            err.message.includes('package') ||
            err.message.includes('Cannot read properties of undefined') ||
            err.message.includes('undefined') && err.message.includes('reading') ||
            err.message.includes('parsing') ||
            err.message.includes('spine')
          )) {
            console.error('📦 EPUB 구조 분석 오류 - SimpleRenderer로 자동 전환');
            
            // 자동으로 SimpleRenderer로 전환
            if (onError) {
              onError(new Error('ReactReader 렌디션 EPUB 파싱 실패 - SimpleRenderer로 전환'));
            }
          } else {
            handleReaderError(err);
          }
        });
      } catch (listenerError) {
        console.warn('⚠️ 이벤트 리스너 추가 실패:', listenerError);
      }
    }
  };

  // iframe 내부에 텍스트 선택 이벤트 추가
  const addTextSelectionEvents = (rendition) => {
    try {
      
      // iframe 찾기
      const iframe = document.querySelector('#react-reader iframe') || 
                    document.querySelector('iframe[src*="blob:"]') ||
                    document.querySelector('iframe');
      
      if (!iframe) {
        console.warn('⚠️ iframe을 찾을 수 없습니다');
        return;
      }

      // iframe의 document에 접근
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (!iframeDoc) {
        console.warn('⚠️ iframe document에 접근할 수 없습니다');
        return;
      }


      // 텍스트 선택 핸들러
      const handleIframeSelection = () => {
        const selection = iframeDoc.getSelection();
        const text = selection.toString().trim();
        
        if (text && onTextSelection) {
          onTextSelection(text, { 
            page: location,
            startChat: false
          });
        }
      };

      // 컨텍스트 메뉴 핸들러
      const handleIframeContextMenu = (e) => {
        const selection = iframeDoc.getSelection();
        const text = selection.toString().trim();
        
        
        if (text) {
          e.preventDefault();
          
          // iframe의 좌표를 전체 페이지 좌표로 변환
          const iframeRect = iframe.getBoundingClientRect();
          const adjustedX = e.clientX + iframeRect.left;
          const adjustedY = e.clientY + iframeRect.top;
          
          setContextMenu({
            x: adjustedX,
            y: adjustedY,
            text: text
          });
          
        }
      };

      // 클릭으로 메뉴 닫기
      const handleIframeClick = () => {
        setContextMenu(null);
      };

      // iframe 내부에 이벤트 리스너 추가
      iframeDoc.addEventListener('mouseup', handleIframeSelection);
      iframeDoc.addEventListener('contextmenu', handleIframeContextMenu);
      iframeDoc.addEventListener('click', handleIframeClick);
      
      // 하이라이트 CSS 주입 및 기존 하이라이트 복원
      injectHighlightStyles(iframeDoc);
      setTimeout(() => {
        restoreHighlights();
      }, 100); // 페이지 로드 완료 후 하이라이트 복원

    } catch (error) {
      console.error('❌ iframe 텍스트 선택 이벤트 추가 실패:', error);
    }
  };



  // AI 채팅 시작 핸들러
  const handleStartAIChat = () => {
    if (contextMenu && contextMenu.text) {
      // 현재 위치의 챕터 정보 가져오기
      const chapterInfo = getCurrentChapterInfo();
      
      startChat(
        book.id, 
        location || 1, 
        contextMenu.text,
        chapterInfo
      );
      
      if (onTextSelection) {
        onTextSelection(contextMenu.text, { 
          page: location || 1,
          startChat: true, // AI 채팅 시작 플래그
          chapterInfo: chapterInfo
        });
      }
      
      setContextMenu(null);
      setShowHighlightSubmenu(false);
    }
  };

  // CFI에서 spine index 추출
  const getSpineIndexFromCFI = (cfi) => {
    try {
      if (!cfi) return null;
      
      // CFI 형식: epubcfi(/6/14[chapter-id]!/4/2/2[para-id]/1:0)
      // spine index는 첫 번째 숫자에서 2를 빼고 2로 나눈 값
      const match = cfi.match(/epubcfi\(\/(\d+)/);
      if (match) {
        const spineIndex = Math.floor((parseInt(match[1]) - 2) / 2);
        return Math.max(0, spineIndex);
      }
      return null;
    } catch (error) {
      console.warn('⚠️ CFI에서 spine index 추출 실패:', error);
      return null;
    }
  };

  // spine index를 실제 챕터 번호로 매핑
  const getChapterFromSpineIndex = (spineIndex, chapters) => {
    try {
      if (spineIndex === null || !chapters || chapters.length === 0) {
        return 1;
      }
      
      // spine index를 챕터 번호로 변환 (일반적으로 1:1 매핑이지만 안전하게 처리)
      const chapterNumber = Math.min(spineIndex + 1, chapters.length);
      return Math.max(1, chapterNumber);
    } catch (error) {
      console.warn('⚠️ spine index를 챕터로 변환 실패:', error);
      return 1;
    }
  };

  // 현재 위치의 챕터 정보 가져오기 (개선된 버전)
  const getCurrentChapterInfo = () => {
    try {
      if (renditionRef.current && renditionRef.current.location) {
        const currentLocation = renditionRef.current.location;
        const progress = currentLocation.start?.percentage || 0;
        const cfi = currentLocation.start?.cfi;
        
        // CFI에서 실제 spine index 추출
        const spineIndex = getSpineIndexFromCFI(cfi);
        
        // spine index를 실제 챕터 번호로 변환
        let actualChapter = 1;
        if (spineIndex !== null) {
          // bookChapters가 있으면 정확한 매핑, 없으면 spine index + 1
          if (bookChapters && bookChapters.length > 0) {
            actualChapter = getChapterFromSpineIndex(spineIndex, bookChapters);
          } else {
            actualChapter = spineIndex + 1;
          }
        } else {
          // CFI 파싱 실패 시 진행률 기반 추정 (폴백)
          const totalChapters = bookChapters?.length || 10;
          actualChapter = Math.max(1, Math.ceil(progress * totalChapters));
        }
        
        console.log(`📍 위치 정보: CFI=${cfi}, SpineIndex=${spineIndex}, Chapter=${actualChapter}, Progress=${Math.round(progress * 100)}%`);
        
        return {
          chapter: actualChapter,
          progress: Math.round(progress * 100),
          cfi: cfi,
          spineIndex: spineIndex
        };
      }
    } catch (error) {
      console.warn('⚠️ 챕터 정보 가져오기 실패:', error);
    }
    
    return {
      chapter: 1,
      progress: 0,
      cfi: null,
      spineIndex: null
    };
  };

  // 하이라이트 추가 핸들러
  const handleAddHighlight = (color) => {
    if (contextMenu && contextMenu.text) {
      // 현재 정확한 위치 정보 가져오기
      const chapterInfo = getCurrentChapterInfo();
      
      // 하이라이트 데이터 생성 (정확한 위치 정보 포함)
      const highlight = {
        text: contextMenu.text,
        pageNumber: location || 1, // 기존 호환성을 위해 유지
        chapterNumber: chapterInfo.chapter, // 실제 챕터 번호
        progress: chapterInfo.progress, // 정확한 진행률
        cfi: chapterInfo.cfi, // CFI 위치 정보
        spineIndex: chapterInfo.spineIndex, // spine index
        color: color.color,
        className: color.className,
        position: {
          x: contextMenu.x,
          y: contextMenu.y
        }
      };

      console.log('💾 하이라이트 저장:', {
        text: highlight.text.substring(0, 50) + '...',
        chapter: highlight.chapterNumber,
        progress: `${highlight.progress}%`,
        cfi: highlight.cfi
      });

      // 하이라이트 저장
      addHighlight(book.id, highlight);

      // 실제 텍스트에 하이라이트 적용 (iframe 내부 조작)
      applyHighlightToText(contextMenu.text, color.className);
      
      setContextMenu(null);
      setShowHighlightSubmenu(false);
    }
  };

  // iframe 내부에 하이라이트 CSS 주입
  const injectHighlightStyles = (iframeDoc) => {
    // 이미 스타일이 주입되었는지 확인
    if (iframeDoc.getElementById('highlight-styles')) return;

    const style = iframeDoc.createElement('style');
    style.id = 'highlight-styles';
    style.textContent = `
      .highlight-yellow {
        background-color: #fff9c4 !important;
        color: #5d4e00 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
      }
      
      .highlight-blue {
        background-color: #bbdefb !important;
        color: #0d47a1 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
      }
      
      .highlight-green {
        background-color: #c8e6c9 !important;
        color: #1b5e20 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
      }
      
      .highlight-pink {
        background-color: #f8bbd9 !important;
        color: #880e4f !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
      }
      
      .highlight-purple {
        background-color: #e1bee7 !important;
        color: #4a148c !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
      }
      
      .highlight-underline {
        border-bottom: 3px solid #666 !important;
        padding: 2px 4px !important;
      }
    `;
    
    iframeDoc.head.appendChild(style);
    console.log('✅ iframe에 하이라이트 CSS 주입 완료');
  };

  // iframe 내부 텍스트에 하이라이트 적용
  const applyHighlightToText = (selectedText, className) => {
    try {
      const iframe = document.querySelector('#react-reader iframe') || 
                    document.querySelector('iframe[src*="blob:"]') ||
                    document.querySelector('iframe');
      
      if (!iframe) return;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) return;

      // 하이라이트 CSS 주입
      injectHighlightStyles(iframeDoc);

      // 현재 선택된 텍스트 범위 가져오기
      const selection = iframeDoc.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 하이라이트 요소 생성
        const highlightSpan = iframeDoc.createElement('span');
        highlightSpan.className = className;
        highlightSpan.setAttribute('data-highlight', 'true');
        
        try {
          // 선택된 범위를 하이라이트 요소로 감싸기
          range.surroundContents(highlightSpan);
          
          // 선택 해제
          selection.removeAllRanges();
          
          console.log('✅ 하이라이트 적용 성공:', selectedText.substring(0, 50) + '...');
        } catch (error) {
          console.warn('⚠️ surroundContents 실패, extractContents 시도:', error);
          
          // 대안 방법: 범위의 내용을 추출하고 하이라이트 요소로 교체
          const contents = range.extractContents();
          highlightSpan.appendChild(contents);
          range.insertNode(highlightSpan);
          
          selection.removeAllRanges();
        }
      }
    } catch (error) {
      console.error('❌ 하이라이트 적용 실패:', error);
    }
  };

  // 저장된 하이라이트를 페이지에 복원
  const restoreHighlights = () => {
    try {
      const iframe = document.querySelector('#react-reader iframe') || 
                    document.querySelector('iframe[src*="blob:"]') ||
                    document.querySelector('iframe');
      
      if (!iframe || !book?.id) return;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) return;

      // 하이라이트 CSS 주입
      injectHighlightStyles(iframeDoc);

      // 현재 위치의 하이라이트 가져오기 (챕터 기반)
      const currentChapterInfo = getCurrentChapterInfo();
      const pageHighlights = getHighlightsByPage(book.id, location || 1);
      
      // 추가로 현재 챕터의 하이라이트도 가져오기
      const allHighlights = getHighlights ? getHighlights(book.id) : [];
      const chapterHighlights = allHighlights.filter(h => 
        h.chapterNumber === currentChapterInfo.chapter || h.pageNumber === (location || 1)
      );
      
      const highlightsToRestore = chapterHighlights.length > 0 ? chapterHighlights : pageHighlights;
      
      console.log(`📚 챕터 ${currentChapterInfo.chapter} (페이지 ${location || 1})의 저장된 하이라이트 ${highlightsToRestore.length}개 복원 시작`);

      highlightsToRestore.forEach(highlight => {
        // 텍스트 찾기 (간단한 구현)
        const walker = iframeDoc.createTreeWalker(
          iframeDoc.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node);
        }

        // 하이라이트 텍스트와 일치하는 텍스트 노드 찾기
        for (const textNode of textNodes) {
          const text = textNode.textContent;
          const highlightIndex = text.indexOf(highlight.text);
          
          if (highlightIndex !== -1) {
            try {
              // 범위 생성
              const range = iframeDoc.createRange();
              range.setStart(textNode, highlightIndex);
              range.setEnd(textNode, highlightIndex + highlight.text.length);
              
              // 하이라이트 요소 생성
              const highlightSpan = iframeDoc.createElement('span');
              highlightSpan.className = highlight.className;
              highlightSpan.setAttribute('data-highlight', 'true');
              highlightSpan.setAttribute('data-highlight-id', highlight.id);
              
              // 범위를 하이라이트로 감싸기
              range.surroundContents(highlightSpan);
              
              console.log('✅ 하이라이트 복원:', highlight.text.substring(0, 30) + '...');
              break; // 첫 번째 일치만 처리
            } catch (error) {
              console.warn('⚠️ 하이라이트 복원 실패:', error);
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ 하이라이트 복원 중 오류:', error);
    }
  };



  // ReactReader 안전 렌더링 함수
  const renderReactReader = () => {
    try {
      if (!finalUrl) {
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#666',
            fontSize: '1.1rem'
          }}>
            📚 EPUB 파일을 로드하는 중...
          </div>
        );
      }

             return (
        <ReactReader
          key={`reader-${book?.id}-${initialLocation || 'start'}`}
          url={finalUrl}
          location={initialLocation}
          locationChanged={handleLocationChanged}
          tocChanged={handleTocChanged}
          getRendition={handleGetRendition}
          loadingView={customLoadingView}
          epubOptions={{
            allowScriptedContent: false,
            manager: 'default',
            flow: 'paginated',
            // ServiceWorker 프록시 URL 지원을 위한 설정
            requestMethod: 'GET',
            requestHeaders: {
              'Accept': 'application/epub+zip,application/zip,*/*',
              'Cache-Control': 'no-cache'
            },
            encoding: 'binary',
            // 안정성 설정
            regenerateLocations: false,
            ignoreMissingProperties: true,
            // ServiceWorker 호환성 설정
            canonical: undefined,
            replacements: undefined,
            // 추가 안정성 옵션
            spread: 'auto',
            minSpreadWidth: 768
          }}
          // title="EPUB Reader"
          showToc={false}
          swipeable={false}
          onError={(error) => {
            console.error('📚 ReactReader 컴포넌트 에러:', error);
            console.error('📚 에러 세부 정보:', {
              message: error?.message,
              name: error?.name,
              stack: error?.stack
            });
            
            // package 관련 에러들 포괄적으로 처리
            if (error?.message && (
              error.message.includes('package') ||
              error.message.includes('Cannot read properties of undefined') ||
              error.message.includes('undefined') && error.message.includes('reading')
            )) {
              console.error('📦 EPUB 구조 분석 실패 - 자동 폴백');
              setError('EPUB 파일 구조 분석 중 오류가 발생했습니다. 파일이 손상되었거나 표준에 맞지 않을 수 있습니다.');
              
              // 에러 전파하여 SimpleRenderer로 자동 전환
              if (onError) {
                onError(new Error('ReactReader EPUB 파싱 실패 - SimpleRenderer로 전환'));
              }
            } else {
              handleReaderError(error);
            }
          }}
        />
      );
    } catch (error) {
      console.error('📚 ReactReader 렌더링 중 예외 발생:', error);
      if (error?.message && (
        error.message.includes('package') ||
        error.message.includes('Cannot read properties of undefined')
      )) {
        console.error('📦 렌더링 중 EPUB 파싱 에러');
        if (onError) {
          onError(new Error('렌더링 중 EPUB 파싱 실패 - SimpleRenderer로 전환'));
        }
      }
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#e74c3c',
          fontSize: '1.1rem'
        }}>
          ⚠️ EPUB 렌더링 중 오류가 발생했습니다
        </div>
      );
    }
  };

  return (
    <div style={{ height: '100%' }}>
      {renderReactReader()}
      
      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          data-context-menu
          theme={settings?.theme}
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <ContextMenuItem
            theme={settings?.theme}
            onClick={handleStartAIChat}
          >
            <FiMessageCircle />
            AI와 채팅하기
          </ContextMenuItem>
          
          <ContextMenuItem
            theme={settings?.theme}
            onMouseEnter={() => setShowHighlightSubmenu(true)}
            onMouseLeave={() => setShowHighlightSubmenu(false)}
            style={{ position: 'relative' }}
          >
            <FiEdit3 size={16} />
            하이라이트
            
            {showHighlightSubmenu && (
              <HighlightSubmenu
                theme={settings?.theme}
                onMouseEnter={() => setShowHighlightSubmenu(true)}
                onMouseLeave={() => setShowHighlightSubmenu(false)}
              >
                {highlightColors.map((color, index) => (
                  <HighlightColorOption
                    key={index}
                    theme={settings?.theme}
                    onClick={() => handleAddHighlight(color)}
                  >
                    <HighlightColorCircle
                      color={color.color}
                      theme={settings?.theme}
                    />
                    {color.name}
                  </HighlightColorOption>
                ))}
                
                <HighlightColorOption
                  theme={settings?.theme}
                  onClick={() => handleAddHighlight({ 
                    name: '밑줄', 
                    color: 'transparent', 
                    className: 'highlight-underline' 
                  })}
                >
                  <div style={{ 
                    width: '16px', 
                    height: '2px', 
                    backgroundColor: settings?.theme === 'dark' ? '#e0e0e0' : '#333',
                    borderRadius: '1px'
                  }} />
                  밑줄
                </HighlightColorOption>
              </HighlightSubmenu>
            )}
          </ContextMenuItem>
        </ContextMenu>
      )}
    </div>
  );
});

export default ReactReaderRenderer; 