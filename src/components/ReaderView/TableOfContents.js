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
  margin: 2px 0;
  
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
  padding: ${props => {
    // 레벨에 따른 들여쓰기
    const baseLeft = 20;
    const indent = (props.level - 1) * 20;
    return `8px ${baseLeft}px 8px ${baseLeft + indent}px`;
  }};
  gap: 8px;
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #666;
  font-size: 12px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #333;
  }
`;

const ChapterTitle = styled.div`
  flex: 1;
  font-size: ${props => props.level === 1 ? '0.95rem' : '0.85rem'};
  color: ${props => props.active ? '#1976d2' : (props.level === 1 ? '#333' : '#555')};
  font-weight: ${props => props.active ? '600' : (props.level === 1 ? '600' : '500')};
  line-height: 1.4;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: #1976d2;
  }
`;





const TableOfContents = ({ book, currentPage, onPageChange, onClose, chapters: bookChapters, totalPages }) => {
  // 확장/축소 상태 관리
  const [expandedItems, setExpandedItems] = React.useState(new Set());

  // bookChapters를 계층 구조로 변환
  const chapters = React.useMemo(() => {
    console.log('📖 원본 TOC 데이터:', bookChapters);
    
    // EPUB 데이터가 있으면 사용, 없으면 샘플 데이터
    if (bookChapters && bookChapters.length > 0) {
      // 실제 EPUB 챕터 데이터를 그대로 사용하되, 계층 구조만 추가
      const processedChapters = [];
      let chapterId = 1;
      
      // 재귀적으로 챕터와 서브아이템을 처리하는 함수
      const processChapter = (chapter, index, level = 1, parentId = null) => {
        // 유효성 검사
        if (!chapter || typeof chapter !== 'object') {
          console.warn('⚠️ 유효하지 않은 챕터 데이터:', chapter);
          return;
        }
        
        // 안전하게 title 처리
        const title = (chapter.title || chapter.label || `Chapter ${index}`).trim();
        const hasChildren = chapter.subitems && Array.isArray(chapter.subitems) && chapter.subitems.length > 0;
        
        console.log(`📖 "${title}" -> 레벨: ${level}, 자식있음: ${hasChildren}, 서브아이템: ${chapter.subitems?.length || 0}`);
        console.log('🔍 챕터 객체:', chapter);
        
        const chapterData = {
          id: chapterId++,
          title: title,
          href: chapter.href,
          page: 1,
          level: level,
          chapterIndex: index,
          hasChildren: hasChildren,
          parentId: parentId
        };
        
        processedChapters.push(chapterData);
        
        // 서브아이템이 있으면 재귀적으로 처리
        if (hasChildren) {
          chapter.subitems.forEach((subitem, subIndex) => {
            processChapter(subitem, `${index}-${subIndex}`, level + 1, chapterData.id);
          });
        }
      };
      
      bookChapters.forEach((chapter, index) => {
        processChapter(chapter, index);
      });
      
      // 기본적으로 Part들을 확장된 상태로 설정
      const defaultExpanded = new Set();
      processedChapters.forEach(chapter => {
        if (chapter.title.match(/^Part\s+[IVX]+:/i) && chapter.hasChildren) {
          defaultExpanded.add(chapter.id);
        }
      });
      setExpandedItems(defaultExpanded);
      
      console.log('📚 처리된 챕터들:', processedChapters);
      return processedChapters;
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
  }, [bookChapters, book?.type]);



  // 확장/축소 토글
  const toggleExpand = (chapterId) => {
    console.log('🔄 토글 시도:', chapterId);
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        console.log('📁 닫기:', chapterId);
        newSet.delete(chapterId);
      } else {
        console.log('📂 열기:', chapterId);
        newSet.add(chapterId);
      }
      console.log('📋 업데이트된 확장 목록:', Array.from(newSet));
      return newSet;
    });
  };

  // 표시할 챕터 목록 계산 (계층 구조 고려)
  const visibleChapters = React.useMemo(() => {
    const visible = [];
    
    chapters.forEach(chapter => {
      if (chapter.level === 1) {
        // 레벨 1은 항상 표시
        visible.push(chapter);
      } else {
        // 레벨 2 이상은 부모가 확장되었을 때만 표시
        if (chapter.parentId && expandedItems.has(chapter.parentId)) {
          visible.push(chapter);
        }
      }
    });
    
    console.log('👁️ 표시할 챕터들:', visible.map(c => `${c.title} (레벨: ${c.level})`));
    console.log('📂 확장된 항목들:', Array.from(expandedItems));
    
    return visible;
  }, [chapters, expandedItems]);

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
              <ChapterHeader level={1}>
                <ChapterTitle level={1} style={{ color: '#999', fontStyle: 'italic' }}>
                  목차를 로드하는 중...
                </ChapterTitle>
              </ChapterHeader>
            </ChapterItem>
          ) : (
            visibleChapters.map(chapter => {
              const isActive = chapter.id === currentChapterId;
              const isDisabled = chapter.title === '챕터 로딩 중...';
              const isExpanded = expandedItems.has(chapter.id);
              const hasChildren = chapter.hasChildren;

              return (
                <ChapterItem key={chapter.id} active={isActive}>
                  <ChapterHeader 
                    level={chapter.level}
                    style={{ cursor: isDisabled ? 'default' : 'pointer' }}
                  >
                    {/* 확장/축소 버튼 (자식이 있는 경우만) */}
                    {hasChildren ? (
                      <ExpandButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(chapter.id);
                        }}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </ExpandButton>
                    ) : (
                      <div style={{ width: '16px' }} /> // 빈 공간 유지
                    )}
                    
                    <ChapterTitle 
                      level={chapter.level}
                      active={isActive}
                      onClick={() => !isDisabled && handleChapterClick(chapter)}
                      style={{ 
                        color: isDisabled ? '#999' : (isActive ? '#1976d2' : (chapter.level === 1 ? '#333' : '#555')),
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