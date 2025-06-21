import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiArrowLeft, FiSettings, FiMessageSquare, FiBookmark } from 'react-icons/fi';
import { useBooks } from '../../context/BookContext';
import TableOfContents from './TableOfContents';
import ReadingSettings from './ReadingSettings';
import TextRenderer from './TextRenderer';

import ReactReaderRenderer from './ReactReaderRenderer';
import AIChat from './AIChat';
import LoadingSpinner from './LoadingSpinner';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  background: #fafafa;
`;

const Sidebar = styled.div`
  width: ${props => props.isOpen ? '450px' : '0'};
  background: white;
  border-right: 1px solid #e0e0e0;
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const BookTitle = styled.h1`
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HeaderButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  &:hover {
    background: #f0f0f0;
  }
  
  ${props => props.active && `
    background: #e3f2fd;
    color: #1976d2;
  `}
`;

const ReadingArea = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

const ChatSidebar = styled.div`
  width: ${props => props.isOpen ? props.width + 'px' : '0'};
  min-width: ${props => props.isOpen ? '400px' : '0'};
  max-width: ${props => props.isOpen ? '800px' : '0'};
  background: white;
  border-left: 1px solid #e0e0e0;
  transition: ${props => props.isResizing ? 'none' : 'width 0.3s ease'};
  overflow: hidden;
  position: relative;
`;

const ResizeHandle = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: transparent;
  cursor: col-resize;
  z-index: 10;
  
  &:hover {
    background: #4CAF50;
  }
  
  &:active {
    background: #4CAF50;
  }
`;

// LoadingContainer는 현재 사용되지 않음 (LoadingSpinner 컴포넌트 사용)

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #f44336;
  text-align: center;
  padding: 20px;
`;

const ReaderView = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { getBookById, getBookWithFile, updateProgress, saveReadingSettings, getReadingSettings } = useBooks();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI 상태
  const [showTOC, setShowTOC] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatSidebarWidth, setChatSidebarWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  
  // ReactReaderRenderer ref
  const reactReaderRef = useRef(null);
  
  // 읽기 설정
  const [readingSettings, setReadingSettings] = useState({
    fontSize: 16,
    fontFamily: 'serif',
    lineHeight: 1.6,
    theme: 'light',
    margin: 20,
    textAlign: 'left'
  });
  
  // 현재 페이지/위치
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [bookChapters, setBookChapters] = useState([]);
  
  // bookChapters 상태 변경 로깅
  useEffect(() => {
    // 챕터 변경 로깅은 제거됨
  }, [bookChapters]);

  useEffect(() => {
    let isMounted = true; // cleanup을 위한 플래그

    const loadBook = async () => {
      try {
        setLoading(true);
        
        // 1단계: 메타데이터만 먼저 로드
        const basicBook = getBookById(bookId);
        if (!basicBook) {
          console.error('❌ 책을 찾을 수 없음:', bookId);
          if (isMounted) {
            setError('책을 찾을 수 없습니다.');
          }
          return;
        }
        
        
        // 2단계: IndexedDB에서 실제 파일 데이터 로드
        let bookWithFile = { ...basicBook };
        
        try {
          
          // BookContext에서 제공하는 getBookWithFile 함수 사용하는 대신 직접 호출
          const bookWithFileData = await getBookWithFile(bookId);
          
          if (bookWithFileData && (bookWithFileData.fileData || bookWithFileData.content)) {
            
            bookWithFile = {
              ...basicBook,
              fileData: bookWithFileData.fileData || bookWithFileData.content,
              content: bookWithFileData.fileData || bookWithFileData.content
            };
          } else {
            console.warn('⚠️ IndexedDB에서 파일 데이터를 찾을 수 없음');
            bookWithFile.content = `
              <div style="padding: 40px; text-align: center;">
                <h1>${basicBook.title}</h1>
                <p>작가: ${basicBook.author}</p>
                <p style="color: #f44336; margin: 20px 0;">파일 데이터를 로드할 수 없습니다.</p>
                <p>책이 제대로 업로드되지 않았을 수 있습니다.</p>
                <p>라이브러리로 돌아가서 책을 다시 업로드해주세요.</p>
                <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                  파일 크기: ${(basicBook.size / 1024 / 1024).toFixed(2)} MB<br/>
                  파일 형식: ${basicBook.type?.toUpperCase() || '알 수 없음'}
                </p>
              </div>
            `;
          }
        } catch (dbError) {
          console.error('IndexedDB 로드 실패:', dbError);
          bookWithFile.content = `
            <div style="padding: 40px; text-align: center;">
              <h1>${basicBook.title}</h1>
              <p style="color: #f44336;">데이터베이스 오류가 발생했습니다.</p>
              <p>오류: ${dbError.message}</p>
              <p>페이지를 새로고침하거나 브라우저 캐시를 정리해보세요.</p>
            </div>
          `;
        }
        
        
        if (isMounted) {
          setBook(bookWithFile);
          setLoading(false);
        }
        
        // 저장된 읽기 설정 로드
        const savedSettings = await getReadingSettings(bookId);
        if (savedSettings && isMounted) {
          setReadingSettings(savedSettings);
        }
        
        // 저장된 읽기 위치 로드 (임시로 localStorage 사용, 나중에 IndexedDB로 이전 예정)
        const savedPosition = localStorage.getItem(`reader-position-${bookId}`);
        if (savedPosition && isMounted) {
          setCurrentPage(parseInt(savedPosition));
        }
        
      } catch (err) {
        if (isMounted) {
          setError('책을 로드하는 중 오류가 발생했습니다.');
          console.error('Book loading error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (bookId) {
      loadBook();
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]); // getBookById, getBookWithFile, getReadingSettings는 안정적이므로 의존성에서 제외

  // 읽기 설정 변경 시 저장
  useEffect(() => {
    if (book && bookId) {
      saveReadingSettings(bookId, readingSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingSettings, bookId, book]); // saveReadingSettings는 안정적이므로 의존성에서 제외

  // 페이지 변경 시 진행률 업데이트
  useEffect(() => {
    if (book && currentPage && totalPages && bookId) {
      const progress = Math.round((currentPage / totalPages) * 100);
      updateProgress(bookId, progress);
      localStorage.setItem(`reader-position-${bookId}`, currentPage.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages, bookId, book]); // updateProgress는 안정적이므로 의존성에서 제외

  const handleBack = () => {
    navigate('/');
  };

  const handlePageChange = useCallback((page) => {
    
    // 챕터 네비게이션인지 확인
    if (typeof page === 'object' && page.type === 'chapter') {
      
      // ReactReaderRenderer에서 챕터로 이동
      if (reactReaderRef.current) {
        // href가 직접 전달되었으면 사용, 아니면 bookChapters에서 찾기
        const chapterHref = page.href || (bookChapters[page.chapterIndex] && bookChapters[page.chapterIndex].href);
        if (chapterHref) {
          reactReaderRef.current.goToChapter(chapterHref);
        } else {
          console.warn('⚠️ 챕터 href를 찾을 수 없음');
        }
      } else {
        // SimpleEpubRenderer에서 챕터 인덱스를 특별한 페이지 번호로 변환
        setCurrentPage(-page.chapterIndex - 1); // 음수로 구분
      }
    } else {
      setCurrentPage(page);
      
      // 진행률 저장
      if (book?.id && totalPages > 0) {
        updateProgress(book.id, page, totalPages);
      }
    }
  }, [bookChapters, book?.id, totalPages, updateProgress]);

  const handleSettingsChange = useCallback((newSettings) => {
    console.log('🔧 ReaderView 설정 변경:', newSettings);
    setReadingSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('📋 최종 설정:', updated);
      return updated;
    });
  }, []);

  const handleChaptersChange = useCallback((chapters) => {
    setBookChapters(chapters);
  }, []);

  const handleTextSelection = (selectedText, position) => {
    // startChat 플래그가 있을 때만 AI 채팅 열기
    if (position && position.startChat) {
      setShowChat(true);
    }
  };

  // 사이드바 리사이징 핸들러
  const handleResizeStart = (e) => {
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = chatSidebarWidth;

    const handleMouseMove = (e) => {
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(400, Math.min(800, startWidth + deltaX));
      setChatSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 렌더러 에러 핸들러
  const handleRendererError = (error) => {
    console.error('🚨 렌더러 에러:', error);
    setError('렌더러 오류가 발생했습니다: ' + error.message);
  };

  // 렌더러 선택 로직은 주석으로만 유지
  // book?.type, rendererType, book.hasFile 확인
  
  if (loading) {
    return (
      <Container>
        <LoadingSpinner 
          message="책을 로드하는 중..." 
          subtext="IndexedDB에서 파일 데이터를 불러오고 있습니다"
        />
      </Container>
    );
  }

  if (error || (!loading && !book)) {
    return (
      <Container>
        <ErrorContainer>
          <h3>오류 발생</h3>
          <p>{error || '책을 찾을 수 없습니다.'}</p>
          <button onClick={handleBack}>라이브러리로 돌아가기</button>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Sidebar isOpen={showTOC}>
        {book && (
          <TableOfContents
            book={book}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onClose={() => setShowTOC(false)}
            chapters={bookChapters}
            totalPages={totalPages}
          />
        )}
      </Sidebar>

      <MainContent>
        <Header>
          <HeaderLeft>
            <BackButton onClick={handleBack} title="라이브러리로 돌아가기">
              <FiArrowLeft size={20} />
            </BackButton>
            <BookTitle>{book?.title || '제목 없음'}</BookTitle>
          </HeaderLeft>

          <HeaderRight>
            <HeaderButton
              active={showTOC}
              onClick={() => setShowTOC(!showTOC)}
              title="목차"
            >
              <FiBookmark size={18} />
            </HeaderButton>
            
            <HeaderButton
              active={showSettings}
              onClick={() => setShowSettings(!showSettings)}
              title="읽기 설정"
            >
              <FiSettings size={18} />
            </HeaderButton>
            
            <HeaderButton
              active={showChat}
              onClick={() => setShowChat(!showChat)}
              title="AI 채팅"
            >
              <FiMessageSquare size={18} />
            </HeaderButton>
            

          </HeaderRight>
        </Header>

        <ReadingArea>
          <ContentArea>
            {book?.type === 'epub' ? (
              <ReactReaderRenderer
                ref={reactReaderRef}
                key={`react-reader-${book?.id}`}
                book={book}
                settings={readingSettings}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                onTotalPagesChange={setTotalPages}
                onChaptersChange={handleChaptersChange}
                onTextSelection={handleTextSelection}
                onError={handleRendererError}
              />
            ) : (
              <TextRenderer
                book={book}
                settings={readingSettings}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                onTotalPagesChange={setTotalPages}
                onTextSelection={handleTextSelection}
                onToggleTOC={() => setShowTOC(!showTOC)}
              />
            )}
            
            {showSettings && (
              <ReadingSettings
                settings={readingSettings}
                onSettingsChange={handleSettingsChange}
                onClose={() => setShowSettings(false)}
              />
            )}
          </ContentArea>

          <ChatSidebar 
            isOpen={showChat} 
            width={chatSidebarWidth}
            isResizing={isResizing}
          >
            {showChat && (
              <ResizeHandle 
                onMouseDown={handleResizeStart}
                title="사이드바 크기 조절"
              />
            )}
            <AIChat
              book={book}
              currentPage={currentPage}
              onClose={() => setShowChat(false)}
            />
          </ChatSidebar>
        </ReadingArea>
      </MainContent>
    </Container>
  );
};

export default ReaderView; 