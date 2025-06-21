import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useHighlights } from '../../context/HighlightContext';
import { useChat } from '../../context/ChatContext';

// foliate-js는 ES 모듈로 import
const FOLIATE_BASE_URL = 'https://cdn.jsdelivr.net/npm/foliate-js@1.0.1/';

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
  color: ${props => props.theme === 'dark' ? '#e0e0e0' : '#333333'};
  position: relative;
`;

const ViewerContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  
  #foliate-viewer {
    width: 100%;
    height: 100%;
    border: none;
    background: ${props => props.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
  }
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: ${props => props.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
  border-top: 1px solid ${props => props.theme === 'dark' ? '#333' : '#ddd'};
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background: ${props => props.theme === 'dark' ? '#333' : '#fff'};
  color: ${props => props.theme === 'dark' ? '#e0e0e0' : '#333'};
  border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#ddd'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme === 'dark' ? '#444' : '#f0f0f0'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: ${props => props.theme === 'dark' ? '#ccc' : '#666'};
`;

const PageInput = styled.input`
  width: 60px;
  padding: 4px 8px;
  text-align: center;
  background: ${props => props.theme === 'dark' ? '#333' : '#fff'};
  color: ${props => props.theme === 'dark' ? '#e0e0e0' : '#333'};
  border: 1px solid ${props => props.theme === 'dark' ? '#555' : '#ddd'};
  border-radius: 4px;
  font-size: 14px;
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 18px;
  color: ${props => props.theme === 'dark' ? '#ccc' : '#666'};
`;

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  color: ${props => props.theme === 'dark' ? '#ff6b6b' : '#d63031'};
  
  h3 {
    margin-bottom: 10px;
    font-size: 20px;
  }
  
  p {
    margin-bottom: 20px;
    line-height: 1.5;
  }
`;

const TextRenderer = ({ 
  book, 
  settings, 
  currentPage, 
  onPageChange, 
  onTotalPagesChange,
  onTextSelection 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentLocation, setCurrentLocation] = useState(null);
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  
  const { addHighlight } = useHighlights();
  const { startChat } = useChat();

  // foliate-js 동적 로드 함수
  const loadFoliateJS = async () => {
    try {
      
      // foliate-js 모듈들을 동적으로 로드
      const { EPUB } = await import(`${FOLIATE_BASE_URL}epub.js`);
      const { View } = await import(`${FOLIATE_BASE_URL}view.js`);
      
      return { EPUB, View };
      
    } catch (error) {
      console.error('❌ foliate-js 로드 실패:', error);
      throw new Error('foliate-js 라이브러리를 로드할 수 없습니다.');
    }
  };

  // EPUB 뷰어 초기화
  const initializeViewer = async () => {
    if (!book || !containerRef.current) return;

    try {
      setLoading(true);
      setError(null);
      
      
      // foliate-js 모듈 로드
      const { EPUB, View } = await loadFoliateJS();
      
      // 책 파일 데이터 준비
      let bookBlob;
      if (book.fileData && book.fileData.startsWith('data:')) {
        // base64 데이터를 Blob으로 변환
        const base64Data = book.fileData.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        bookBlob = new Blob([bytes], { type: 'application/epub+zip' });
      } else {
        throw new Error('지원되지 않는 책 데이터 형식입니다.');
      }
      
      
      // EPUB 파싱
      const epub = new EPUB(bookBlob);
      await epub.init();
      
      
      // 뷰어 컨테이너 준비
      const viewerContainer = document.createElement('div');
      viewerContainer.id = 'foliate-viewer';
      viewerContainer.style.cssText = `
        width: 100%;
        height: 100%;
        background: ${settings.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
        color: ${settings.theme === 'dark' ? '#e0e0e0' : '#333333'};
        font-family: ${settings.fontFamily};
        font-size: ${settings.fontSize}px;
        line-height: ${settings.lineHeight};
      `;
      
      // 기존 뷰어 제거
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
      }
      
      if (viewerRef.current) {
        viewerRef.current.appendChild(viewerContainer);
      }
      
      // foliate-js 뷰어 생성
      const view = new View(viewerContainer, {
        // 뷰어 설정
        theme: settings.theme,
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        lineHeight: settings.lineHeight,
        margin: 40,
        gap: 20,
        animated: true,
        
        // 페이지 레이아웃 설정
        flow: settings.pageLayout === 'double' ? 'paginated' : 'scrolled',
        spread: settings.pageLayout === 'double' ? 'auto' : 'none',
      });
      
      // EPUB을 뷰어에 로드
      await view.open(epub);
      
      
      // 페이지 이벤트 리스너
      view.addEventListener('relocate', (event) => {
        const location = event.detail;
        setCurrentLocation(location);
        
        if (location.range) {
          const pageNumber = Math.floor(location.range.start * epub.sections.length) + 1;
          if (pageNumber !== currentPage) {
            onPageChange(pageNumber);
          }
        }
      });
      
      // 총 페이지 수 설정
      const estimatedPages = epub.sections?.length || 1;
      setTotalPages(estimatedPages);
      onTotalPagesChange(estimatedPages);
      
      // 텍스트 선택 이벤트
      view.addEventListener('selection', (event) => {
        const { text, cfi } = event.detail;
        if (text && onTextSelection) {
          onTextSelection(text, { cfi });
        }
      });
      
      setViewer(view);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ 뷰어 초기화 실패:', error);
      setError(`뷰어 초기화 실패: ${error.message}`);
      setLoading(false);
    }
  };

  // 책이 변경될 때 뷰어 초기화
  useEffect(() => {
    if (book) {
      initializeViewer();
    }
  }, [book]);

  // 설정이 변경될 때 뷰어 업데이트
  useEffect(() => {
    if (viewer && !loading) {
      try {
        // 테마 업데이트
        viewer.setTheme(settings.theme);
        
        // 폰트 설정 업데이트
        viewer.setFontSize(settings.fontSize);
        viewer.setFontFamily(settings.fontFamily);
        viewer.setLineHeight(settings.lineHeight);
        
        // 레이아웃 업데이트
        viewer.setFlow(settings.pageLayout === 'double' ? 'paginated' : 'scrolled');
        viewer.setSpread(settings.pageLayout === 'double' ? 'auto' : 'none');
        
      } catch (error) {
        console.warn('⚠️ 뷰어 설정 업데이트 실패:', error);
      }
    }
  }, [viewer, settings, loading]);

  // 페이지 변경 처리
  useEffect(() => {
    if (viewer && !loading && currentPage !== undefined) {
      try {
        // foliate-js의 페이지 네비게이션
        const progress = (currentPage - 1) / Math.max(totalPages - 1, 1);
        viewer.goToFraction(progress);
      } catch (error) {
        console.warn('⚠️ 페이지 이동 실패:', error);
      }
    }
  }, [viewer, currentPage, totalPages, loading]);

  const handlePrevPage = () => {
    if (viewer && !loading) {
      viewer.prev();
    }
  };

  const handleNextPage = () => {
    if (viewer && !loading) {
      viewer.next();
    }
  };

  const handlePageInputChange = (e) => {
    const page = parseInt(e.target.value);
    if (page && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  if (loading) {
    return (
      <Container theme={settings.theme}>
        <LoadingMessage theme={settings.theme}>
          📚 아름다운 책 뷰어를 준비하고 있습니다...
        </LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container theme={settings.theme}>
        <ErrorMessage theme={settings.theme}>
          <h3>📖 책을 열 수 없습니다</h3>
          <p>{error}</p>
          <p>다른 EPUB 파일을 시도해보시거나, 페이지를 새로고침해주세요.</p>
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container theme={settings.theme} ref={containerRef}>
      <ViewerContainer theme={settings.theme}>
        <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
      </ViewerContainer>
      
      <Controls theme={settings.theme}>
        <NavButton 
          theme={settings.theme}
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
        >
          <FiChevronLeft />
          이전
        </NavButton>
        
        <PageInfo theme={settings.theme}>
          페이지
          <PageInput
            theme={settings.theme}
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={handlePageInputChange}
          />
          / {totalPages}
        </PageInfo>
        
        <NavButton 
          theme={settings.theme}
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          다음
          <FiChevronRight />
        </NavButton>
      </Controls>
    </Container>
  );
};

export default TextRenderer; 