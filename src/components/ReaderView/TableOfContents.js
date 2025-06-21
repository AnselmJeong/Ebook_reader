import React from 'react';
import styled from 'styled-components';
import { FiX } from 'react-icons/fi';

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const ChapterList = styled.div`
  padding: 0;
`;

const ChapterItem = styled.div`
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin: 4px 0;
  
  &:hover {
    background: #f8f9fa;
  }
  
  ${props => props.active && `
    background: #e3f2fd;
    
    &:hover {
      background: #e3f2fd;
    }
  `}
`;

const ChapterHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 20px;
  gap: 8px;
`;


const ChapterTitle = styled.div`
  flex: 1;
  font-size: 0.9rem;
  color: ${props => props.active ? '#1976d2' : '#333'};
  font-weight: ${props => props.active ? '600' : '500'};
  line-height: 1.4;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: #1976d2;
  }
`;





const TableOfContents = ({ book, currentPage, onPageChange, onClose, chapters: bookChapters, totalPages }) => {
  // bookChapters를 직접 변환하여 사용 (useState 제거)
  const chapters = React.useMemo(() => {
    // EPUB 데이터가 있으면 사용, 없으면 샘플 데이터
    if (bookChapters && bookChapters.length > 0) {
      // 실제 EPUB 챕터 데이터를 TOC 형식으로 변환
      return bookChapters.map((chapter, index) => ({
        id: index + 1,
        title: chapter.title,
        href: chapter.href, // href 정보 포함
        page: 1, // 페이지 번호는 실제로는 의미없음
        level: 1,
        chapterIndex: index
      }));
    } else {
      // 폴백: 샘플 데이터
      if (book?.type === 'pdf') {
        return [
          { id: 1, title: '표지', page: 1, level: 1 },
          { id: 2, title: '목차', page: 2, level: 1 },
          { id: 3, title: '제1장 - 서론', page: 5, level: 1 }
        ];
      } else {
        return [
          { id: 1, title: '챕터 로딩 중...', page: 1, level: 1 }
        ];
      }
    }
  }, [bookChapters, book?.id, book?.type]);



  const handleChapterClick = (chapter) => {
    
    // href가 있으면 ReactReader용 챕터 이동, 없으면 기존 방식
    if (chapter.href && onPageChange) {
      // ReactReader의 경우 href로 직접 이동
      onPageChange({ type: 'chapter', href: chapter.href, chapterIndex: chapter.chapterIndex });
    } else if (chapter.chapterIndex !== undefined && onPageChange) {
      // SimpleEpubRenderer에서 챕터 시작 페이지를 계산하여 이동
      onPageChange({ type: 'chapter', chapterIndex: chapter.chapterIndex });
    } else {
      onPageChange(chapter.page);
    }
  };

  const getCurrentChapter = () => {
    // 현재 페이지에 해당하는 챕터 찾기
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (chapters[i].page <= currentPage) {
        return chapters[i].id;
      }
    }
    return null;
  };

  const currentChapterId = getCurrentChapter();

  return (
    <Container>
      <Header>
        <Title>목차</Title>
        <CloseButton onClick={onClose}>
          <FiX size={18} />
        </CloseButton>
      </Header>



      <Content>
        <ChapterList>
          {chapters.length === 0 ? (
            <ChapterItem>
              <ChapterHeader>
                <ChapterTitle style={{ color: '#999', fontStyle: 'italic' }}>
                  목차를 로드하는 중...
                </ChapterTitle>
              </ChapterHeader>
            </ChapterItem>
          ) : (
            chapters.map(chapter => {
              const isActive = chapter.id === currentChapterId;
              const isDisabled = chapter.title === '챕터 로딩 중...';

              return (
                <ChapterItem key={chapter.id} active={isActive}>
                  <ChapterHeader 
                    onClick={() => !isDisabled && handleChapterClick(chapter)}
                    style={{ cursor: isDisabled ? 'default' : 'pointer' }}
                  >
                    <ChapterTitle 
                      active={isActive}
                      style={{ 
                        color: isDisabled ? '#999' : (isActive ? '#1976d2' : '#333'),
                        fontStyle: isDisabled ? 'italic' : 'normal'
                      }}
                    >
                      {chapter.title}
                    </ChapterTitle>
                  </ChapterHeader>
                </ChapterItem>
              );
            })
          )}
        </ChapterList>
      </Content>
    </Container>
  );
};

export default TableOfContents; 