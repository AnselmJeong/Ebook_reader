import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { ReactReader } from 'react-reader';
import { FiRefreshCw, FiAlertCircle, FiMessageCircle } from 'react-icons/fi';
import styled from 'styled-components';
import { EpubAnalyzer } from '../../utils/EpubAnalyzer';
import { useChat } from '../../context/ChatContext';

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

const ReactReaderRenderer = forwardRef(({ 
  book, 
  settings, 
  currentPage, 
  onPageChange, 
  onTotalPagesChange,
  onChaptersChange,
  onTextSelection,
  onError 
}, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(0);
  const [bookUrl, setBookUrl] = useState(null);
  const [finalUrl, setFinalUrl] = useState(null);
  const [readerTimeout, setReaderTimeout] = useState(null);
  const renditionRef = useRef(null);

  const [contextMenu, setContextMenu] = useState(null);

  // AI 채팅 훅
  const { startChat } = useChat();

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
      }
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu]);

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

  // 위치 변경 핸들러 (useCallback으로 메모이제이션)
  const handleLocationChanged = useCallback((epubcfi) => {
    setLocation(epubcfi);
    // themes API가 자동으로 스타일을 유지하므로 추가 적용 불필요
  }, []);

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

  // 부모 컴포넌트에서 챕터 이동 함수에 접근할 수 있도록 노출
  useImperativeHandle(ref, () => ({
    goToChapter
  }), [goToChapter]);

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
    
    // book이 준비되었을 때 추가 설정 적용
    if (rendition && rendition.book) {
      rendition.book.ready.then(() => {
        if (isUnmountingRef.current) return;
        
        console.log('📖 EPUB book 준비됨 - 설정 재적용');
        // 책이 로드된 후 설정 재적용
        applySettings(rendition, settings);
        
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
          
          // 추가 보험용 재적용
          setTimeout(() => {
            if (!isUnmountingRef.current && rendition && settings) {
              applySettings(rendition, settings);
            }
          }, 5); // 100ms → 5ms로 대폭 단축
        });

        // 페이지 변경 시 즉시 설정 재적용 (깜빡임 방지)
        rendition.on('relocated', () => {
          if (isUnmountingRef.current) return;
          
          console.log('📍 페이지 이동 - 즉시 설정 재적용');
          
          // 즉시 적용 (지연 없음)
          if (rendition && settings) {
            applySettings(rendition, settings);
          }
          
          // 추가 보험용 재적용 (미세한 지연)
          setTimeout(() => {
            if (!isUnmountingRef.current && rendition && settings) {
              applySettings(rendition, settings);
            }
          }, 10); // 100ms → 10ms로 단축
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
          
          // package 관련 오류인지 확인
          if (err.message && err.message.includes('package')) {
            console.error('📦 EPUB package 파싱 오류 - SimpleRenderer로 자동 전환');
            
            // 자동으로 SimpleRenderer로 전환
            if (onError) {
              onError(new Error('ReactReader에서 EPUB 구조 분석 실패 - SimpleRenderer로 전환합니다.'));
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
      

    } catch (error) {
      console.error('❌ iframe 텍스트 선택 이벤트 추가 실패:', error);
    }
  };



  // AI 채팅 시작 핸들러
  const handleStartAIChat = () => {
    if (contextMenu && contextMenu.text) {
      startChat(
        book.id, 
        location || 1, 
        contextMenu.text
      );
      
      if (onTextSelection) {
        onTextSelection(contextMenu.text, { 
          page: location || 1,
          startChat: true // AI 채팅 시작 플래그
        });
      }
      
      setContextMenu(null);
    }
  };

  return (
    <div style={{ height: '100%' }}>
              <ReactReader
          key={`reader-${book?.id}`}
          url={finalUrl}
          location={location}
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
            if (error.message && error.message.includes('package')) {
              setError('EPUB 파일 구조 분석 중 오류가 발생했습니다. 파일이 손상되었거나 표준에 맞지 않을 수 있습니다.');
            } else {
              handleReaderError(error);
            }
          }}
        />
      
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
        </ContextMenu>
      )}
    </div>
  );
});

export default ReactReaderRenderer; 