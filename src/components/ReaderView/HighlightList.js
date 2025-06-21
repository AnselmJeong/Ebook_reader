import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiX, FiTrash2, FiClock, FiBookOpen, FiSearch } from 'react-icons/fi';
import { useHighlights } from '../../context/HighlightContext';

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
  display: flex;
  align-items: center;
  gap: 8px;
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

const SearchContainer = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #4CAF50;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const HighlightItem = styled.div`
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const HighlightText = styled.div`
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
  margin-bottom: 8px;
  word-wrap: break-word;
  
  // 하이라이트 색상 표시
  ${props => props.className === 'highlight-yellow' && `
    background-color: #ffeb3b;
    padding: 2px 4px;
    border-radius: 2px;
  `}
  ${props => props.className === 'highlight-green' && `
    background-color: #4caf50;
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
  `}
  ${props => props.className === 'highlight-blue' && `
    background-color: #2196f3;
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
  `}
  ${props => props.className === 'highlight-pink' && `
    background-color: #e91e63;
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
  `}
  ${props => props.className === 'highlight-purple' && `
    background-color: #9c27b0;
    color: white;
    padding: 2px 4px;
    border-radius: 2px;
  `}
  ${props => props.className === 'highlight-underline' && `
    border-bottom: 2px solid #333;
    padding: 2px 4px;
  `}
`;

const HighlightMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #666;
`;

const HighlightInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const PageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    color: #f44336;
    background: #fff5f5;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
  color: #666;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 16px;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  margin: 0;
`;

const StatsContainer = styled.div`
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.85rem;
  color: #666;
`;

const HighlightList = ({ book, onClose, onHighlightClick }) => {
  const { getHighlights, removeHighlight, searchHighlights } = useHighlights();
  const [highlights, setHighlights] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHighlights, setFilteredHighlights] = useState([]);

  useEffect(() => {
    if (book) {
      const bookHighlights = getHighlights(book.id);
      // 최신순으로 정렬
      const sortedHighlights = bookHighlights.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      setHighlights(sortedHighlights);
      setFilteredHighlights(sortedHighlights);
    }
  }, [book, getHighlights]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchHighlights(book.id, searchQuery);
      setFilteredHighlights(results);
    } else {
      setFilteredHighlights(highlights);
    }
  }, [searchQuery, highlights, book?.id, searchHighlights]);

  const handleDeleteHighlight = (highlightId, e) => {
    e.stopPropagation();
    if (window.confirm('이 하이라이트를 삭제하시겠습니까?')) {
      removeHighlight(book.id, highlightId);
      
      // 로컬 상태 업데이트
      const updatedHighlights = highlights.filter(h => h.id !== highlightId);
      setHighlights(updatedHighlights);
    }
  };

  const handleHighlightClick = (highlight) => {
    if (onHighlightClick) {
      onHighlightClick(highlight);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return '오늘';
    } else if (diffDays === 2) {
      return '어제';
    } else if (diffDays <= 7) {
      return `${diffDays - 1}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getColorName = (className) => {
    switch (className) {
      case 'highlight-yellow': return '노랑';
      case 'highlight-green': return '초록';
      case 'highlight-blue': return '파랑';
      case 'highlight-pink': return '분홍';
      case 'highlight-purple': return '보라';
      case 'highlight-underline': return '밑줄';
      default: return '기본';
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <FiBookOpen />
          하이라이트
        </Title>
        <CloseButton onClick={onClose}>
          <FiX size={18} />
        </CloseButton>
      </Header>

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="하이라이트 내용 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchContainer>

      {highlights.length > 0 && (
        <StatsContainer>
          총 {highlights.length}개의 하이라이트
          {searchQuery && ` (검색 결과: ${filteredHighlights.length}개)`}
        </StatsContainer>
      )}

      <Content>
        {filteredHighlights.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>📝</EmptyStateIcon>
            <EmptyStateText>
              {searchQuery ? (
                <>
                  "{searchQuery}"에 대한<br />
                  검색 결과가 없습니다.
                </>
              ) : (
                <>
                  아직 하이라이트가 없습니다.<br />
                  텍스트를 선택하여 하이라이트를 추가해보세요!
                </>
              )}
            </EmptyStateText>
          </EmptyState>
        ) : (
          filteredHighlights.map(highlight => (
            <HighlightItem
              key={highlight.id}
              onClick={() => handleHighlightClick(highlight)}
            >
              <HighlightText className={highlight.className}>
                "{highlight.text}"
              </HighlightText>
              <HighlightMeta>
                <HighlightInfo>
                  <PageInfo>
                    <FiBookOpen size={12} />
                    {highlight.chapterNumber ? (
                      `챕터 ${highlight.chapterNumber}${highlight.progress ? ` (${highlight.progress}%)` : ''}`
                    ) : (
                      `페이지 ${highlight.pageNumber}`
                    )}
                  </PageInfo>
                  <TimeInfo>
                    <FiClock size={12} />
                    {formatTime(highlight.createdAt)}
                  </TimeInfo>
                  <span>{getColorName(highlight.className)}</span>
                </HighlightInfo>
                <DeleteButton
                  onClick={(e) => handleDeleteHighlight(highlight.id, e)}
                  title="하이라이트 삭제"
                >
                  <FiTrash2 size={14} />
                </DeleteButton>
              </HighlightMeta>
            </HighlightItem>
          ))
        )}
      </Content>
    </Container>
  );
};

export default HighlightList; 