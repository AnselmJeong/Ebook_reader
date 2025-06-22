import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiArrowLeft, FiSettings, FiMessageSquare, FiBookmark, FiEdit3 } from 'react-icons/fi';
import { useBooks } from '../../context/BookContext';
import TableOfContents from './TableOfContents';
import ReadingSettings from './ReadingSettings';
import TextRenderer from './TextRenderer';

import ReactReaderRenderer from './ReactReaderRenderer';
import AIChat from './AIChat';
import LoadingSpinner from './LoadingSpinner';
import HighlightList from './HighlightList';

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: #fafafa;
  overflow: hidden;
  position: relative;
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
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const RightSidebar = styled.div`
  width: ${props => props.isOpen ? '450px' : '0'};
  flex-shrink: 0;
  background: white;
  border-left: 1px solid #e0e0e0;
  transition: width 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  position: relative;
  overflow: hidden;
`;

const ContentArea = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
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
  const { getBookById, getBookWithFile, saveReadingSettings, getReadingSettings, saveBookmark, getBookmark } = useBooks();
  
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI 상태
  const [showTOC, setShowTOC] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);

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
  
  // 사이드바 변경 시 react-reader 리사이즈
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      
      // 추가로 ReactReader에 설정 재적용 요청
      if (reactReaderRef.current) {
        const rendition = reactReaderRef.current.getRendition?.();
        if (rendition && readingSettings) {
          console.log('🔄 사이드바 변경 후 설정 재적용');
          // 설정 재적용
          if (rendition.themes) {
            const fontSize = readingSettings?.fontSize || 20;
            const lineHeight = readingSettings?.lineHeight || 1.8;
            const fontFamily = readingSettings?.fontFamily || 'serif';
            
            const fontFamilyMap = {
              'serif': 'Georgia, serif',
              'sans-serif': '-apple-system, BlinkMacSystemFont, sans-serif',
              'monospace': '"Courier New", monospace'
            };
            const fontFamilyCSS = fontFamilyMap[fontFamily] || fontFamily;
            
            rendition.themes.fontSize(`${fontSize}px`);
            rendition.themes.font(fontFamilyCSS);
            
            const strongStyle = `
              font-size: ${fontSize}px !important;
              line-height: ${lineHeight} !important;
              font-family: ${fontFamilyCSS} !important;
            `;
            
            rendition.themes.override('*', strongStyle);
            rendition.themes.override('body', strongStyle);
            rendition.themes.override('p', strongStyle);
            
            console.log(`✅ 사이드바 변경 후 설정 재적용 완료: ${fontSize}px`);
          }
        }
      }
    }, 350); // transition 완료 후 + 설정 적용 시간
    
    return () => clearTimeout(timer);
  }, [showTOC, showHighlights, showChat, readingSettings]);
  
  // 목차 관련 상태
  const [bookChapters, setBookChapters] = useState([]);
  
  // 북마크 관련 상태
  // const [currentLocation, setCurrentLocation] = useState(null);
  const [lastLocation, setLastLocation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100); // EPUB은 진행률 기반으로 100페이지로 설정

  useEffect(() => {
    let isMounted = true; // cleanup을 위한 플래그

    const loadBook = async () => {
      try {
        setLoading(true);
        
        // 1단계: 메타데이터만 먼저 로드
        const basicBook = await getBookById(bookId);
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
        
        // CFI 기반 북마크 로드 (마지막 읽던 위치)
        try {
          const bookmark = await getBookmark(bookId);
          if (bookmark && isMounted) {
            console.log('🔖 CFI 북마크 발견:', {
              cfi: bookmark.cfi || bookmark.epubcfi,
              progress: bookmark.progress,
              chapter: bookmark.chapterTitle
            });
            
            // CFI 우선, 없으면 기존 location 사용
            if (bookmark.cfi || bookmark.epubcfi) {
              // CFI가 있으면 CFI 문자열로 위치 설정
              setLastLocation(bookmark.cfi || bookmark.epubcfi);
              console.log('📍 CFI로 위치 복원:', bookmark.cfi || bookmark.epubcfi);
            } else if (bookmark.location) {
              // 기존 location 객체가 있으면 사용
              setLastLocation(bookmark.location);
              console.log('📍 Location 객체로 위치 복원');
            }
            
            // 진행률 기반 페이지 정보 설정
            const progress = bookmark.progress || 0;
            const estimatedPage = Math.max(1, Math.round(progress));
            setCurrentPage(estimatedPage);
            setTotalPages(100); // EPUB은 진행률 기반으로 100 고정
            
            console.log('📊 진행률 복원:', `${progress}% (페이지 ${estimatedPage}/100)`);
          } else {
            console.log('🔖 북마크 없음 - 처음부터 시작');
            setLastLocation(null); // 명시적으로 null 설정
          }
        } catch (bookmarkError) {
          console.warn('⚠️ 북마크 로드 실패:', bookmarkError);
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
      }
    }
    // 일반 페이지 변경은 처리하지 않음 (EPUB에서는 의미 없음)
  }, [bookChapters]);

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

  // CFI 기반 위치 변경 핸들러 (북마크 자동 저장)
  const handleLocationChange = useCallback((locationData) => {
    const { location, href, title } = locationData;
    // setCurrentLocation(location);
    
    // CFI 기반 북마크 저장 (디바운스)
    const saveBookmarkDebounced = setTimeout(async () => {
      if (bookId && location) {
        try {
          // CFI에서 진행률 계산
          const progress = location.start?.percentage || 0;
          const estimatedPage = Math.max(1, Math.round(progress * 100));
          
          const bookmarkData = {
            // CFI 정보 (핵심)
            cfi: location.start?.cfi || null,
            epubcfi: location.start?.cfi || null, // 호환성을 위해 중복 저장
            
            // 진행률 정보
            progress: Math.round(progress * 100), // 0-100%
            percentage: progress, // 0-1
            
            // 페이지 정보 (참고용)
            currentPage: estimatedPage,
            totalPages: 100, // EPUB은 진행률 기반으로 100으로 고정
            
            // 챕터 정보
            chapterHref: href || null,
            chapterTitle: title || null,
            
            // 위치 정보 (전체)
            location: location,
            
            // 메타데이터
            timestamp: new Date().toISOString(),
            readingTime: Date.now() // 읽기 시간 추적용
          };
          
          await saveBookmark(bookId, bookmarkData);
          console.log('🔖 CFI 기반 북마크 자동 저장:', {
            cfi: bookmarkData.cfi,
            progress: `${bookmarkData.progress}%`,
            chapter: bookmarkData.chapterTitle
          });
        } catch (error) {
          console.error('❌ 북마크 저장 실패:', error);
        }
      }
    }, 2000); // 2초 디바운스 (읽기 중 너무 자주 저장되지 않도록)

    return () => clearTimeout(saveBookmarkDebounced);
  }, [bookId, saveBookmark]);

  // 페이지 변경 핸들러
  const handlePageChangeInternal = useCallback((page) => {
    if (typeof page === 'number') {
      setCurrentPage(page);
    }
  }, []);

  const handleTextSelection = (selectedText, position) => {
    // startChat 플래그가 있을 때만 AI 채팅 열기
    if (position && position.startChat) {
      setShowChat(true);
    }
  };

  // 북마크로 이동 핸들러 (하이라이트와 AI 채팅에서 공통 사용)
  const handleGoToBookmark = (bookmarkData) => {
    console.log('🔖 북마크로 이동:', bookmarkData);
    
    if (reactReaderRef.current) {
      try {
        if (bookmarkData.type === 'cfi' && bookmarkData.cfi) {
          // CFI로 정확한 위치 이동
          console.log('📍 CFI로 이동:', bookmarkData.cfi);
          
          if (reactReaderRef.current.goToCfi) {
            reactReaderRef.current.goToCfi(bookmarkData.cfi);
          } else {
            const rendition = reactReaderRef.current.getRendition?.();
            if (rendition && rendition.display) {
              rendition.display(bookmarkData.cfi);
            }
          }
          
          console.log('✅ CFI 이동 완료');
          
        } else if (bookmarkData.type === 'progress' && bookmarkData.progress !== undefined) {
          // 진행률로 이동
          const progressDecimal = bookmarkData.progress / 100;
          console.log('📊 진행률로 이동:', bookmarkData.progress + '%');
          
          const rendition = reactReaderRef.current.getRendition?.();
          if (rendition && rendition.book && rendition.book.locations) {
            const location = rendition.book.locations.cfiFromPercentage(progressDecimal);
            rendition.display(location);
          }
        }
        
        // 이동 후 하이라이트 복원
        setTimeout(() => {
          if (reactReaderRef.current?.restoreHighlights) {
            reactReaderRef.current.restoreHighlights();
          }
        }, 500);
        
      } catch (error) {
        console.warn('⚠️ 북마크 이동 실패:', error);
      }
    }
  };

  // 하이라이트 클릭 핸들러 (북마크 이동)
  const handleHighlightClick = (highlight) => {
    console.log('🎯 하이라이트 북마크로 이동:', {
      text: highlight.text.substring(0, 50) + '...',
      cfi: highlight.bookmark?.cfi || highlight.cfi,
      progress: highlight.progress
    });
    
    // 북마크 정보로 정확한 위치 이동
    const bookmarkCfi = highlight.bookmark?.cfi || highlight.cfi;
    
    if (bookmarkCfi) {
      handleGoToBookmark({ type: 'cfi', cfi: bookmarkCfi });
    } else if (highlight.progress) {
      handleGoToBookmark({ type: 'progress', progress: highlight.progress });
    } else {
      console.warn('❌ 북마크 정보가 없습니다');
    }
    
    // 하이라이트 목록은 열린 상태로 유지 (닫지 않음)
    // setShowHighlights(false); // 이 줄을 제거하여 사이드바 유지
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
      <Sidebar isOpen={showTOC || showHighlights}>
        {book && showTOC && (
          <TableOfContents
            book={book}
            onPageChange={handlePageChange}
            onClose={() => setShowTOC(false)}
            chapters={bookChapters}
          />
        )}
        {book && showHighlights && (
          <HighlightList
            book={book}
            onClose={() => setShowHighlights(false)}
            onHighlightClick={handleHighlightClick}
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
              active={showHighlights}
              onClick={() => setShowHighlights(!showHighlights)}
              title="하이라이트 목록"
            >
              <FiEdit3 size={18} />
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
                onPageChange={handlePageChange}
                onChaptersChange={handleChaptersChange}
                onTextSelection={handleTextSelection}
                onError={handleRendererError}
                onLocationChange={handleLocationChange}
                onPageChangeInternal={handlePageChangeInternal}
                initialLocation={lastLocation}
                currentPage={currentPage}
                totalPages={totalPages}
                bookChapters={bookChapters}
              />
            ) : (
              <TextRenderer
                book={book}
                settings={readingSettings}
                onPageChange={handlePageChange}
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
        </ReadingArea>
      </MainContent>
      
      <RightSidebar isOpen={showChat}>
        {book && showChat && (
          <AIChat
            book={book}
            onClose={() => setShowChat(false)}
            onGoToBookmark={handleGoToBookmark}
          />
        )}
      </RightSidebar>
    </Container>
  );
};

export default ReaderView; 