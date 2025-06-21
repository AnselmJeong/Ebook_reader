import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiBookOpen, FiMoreVertical, FiTrash2, FiInfo } from 'react-icons/fi';
import { useBooks } from '../../context/BookContext';

const Card = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  border: 1px solid #f0f0f0;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    border-color: #e0e0e0;
  }
`;

const CoverContainer = styled.div`
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

const CoverImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CoverPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 0.9rem;
  text-align: center;
  padding: 20px;
`;

const BookIcon = styled(FiBookOpen)`
  font-size: 2rem;
  margin-bottom: 10px;
  opacity: 0.5;
`;

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: ${props => props.progress}%;
  height: 4px;
  background: #4CAF50;
  transition: width 0.3s ease;
`;

const InfoContainer = styled.div`
  padding: 12px;
`;

const Title = styled.h3`
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 6px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Author = styled.p`
  font-size: 0.8rem;
  color: #666;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #999;
`;

const Status = styled.span`
  background: ${props => props.free ? '#4CAF50' : '#FF9800'};
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const LastOpened = styled.span`
  font-size: 0.75rem;
`;

const MoreButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
  
  ${Card}:hover & {
    opacity: 1;
  }
  
  &:hover {
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  min-width: 150px;
  z-index: 20;
  opacity: ${props => props.isOpen ? 1 : 0};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  pointer-events: ${props => props.isOpen ? 'auto' : 'none'};
  transition: all 0.2s ease;
`;

const MenuItem = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: ${props => props.danger ? '#e74c3c' : '#333'};
  transition: background-color 0.2s ease;
  
  &:hover {
    background: ${props => props.danger ? '#fee' : '#f8f9fa'};
  }
  
  svg {
    font-size: 0.85rem;
  }
`;

const MenuContainer = styled.div`
  position: relative;
`;

const BookCard = ({ book, onClick }) => {
  const { removeBook } = useBooks();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}주 전`;
    return date.toLocaleDateString();
  };

  const handleMoreClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleDeleteBook = async (e) => {
    e.stopPropagation();
    
    const confirmDelete = window.confirm(
      `"${book.title}"을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );
    
    if (confirmDelete) {
      try {
        await removeBook(book.id);
        console.log(`📚 책 삭제 완료: ${book.title}`);
      } catch (error) {
        console.error('책 삭제 실패:', error);
        alert('책 삭제 중 오류가 발생했습니다.');
      }
    }
    
    setIsMenuOpen(false);
  };

  const handleShowInfo = (e) => {
    e.stopPropagation();
    
    const fileSize = book.size ? `${(book.size / 1024 / 1024).toFixed(2)} MB` : '알 수 없음';
    const addedDate = book.addedDate ? new Date(book.addedDate).toLocaleDateString() : '알 수 없음';
    
    alert(`📖 책 정보\n\n제목: ${book.title}\n저자: ${book.author}\n파일 크기: ${fileSize}\n추가일: ${addedDate}\n진행률: ${book.progress || 0}%`);
    
    setIsMenuOpen(false);
  };

  // 메뉴 외부 클릭시 닫기
  const handleCardClick = (e) => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    onClick(e);
  };

  return (
    <Card onClick={handleCardClick}>
      <CoverContainer>
        {book.coverImage ? (
          <CoverImage src={book.coverImage} alt={book.title} />
        ) : (
          <CoverPlaceholder>
            <BookIcon />
            <span>{book.type?.toUpperCase()}</span>
          </CoverPlaceholder>
        )}
        {book.progress > 0 && <ProgressBar progress={book.progress} />}
      </CoverContainer>
      
      <MenuContainer ref={menuRef}>
        <MoreButton onClick={handleMoreClick}>
          <FiMoreVertical />
        </MoreButton>
        
        <DropdownMenu isOpen={isMenuOpen}>
          <MenuItem onClick={handleShowInfo}>
            <FiInfo />
            책 정보
          </MenuItem>
          <MenuItem onClick={handleDeleteBook} danger>
            <FiTrash2 />
            삭제
          </MenuItem>
        </DropdownMenu>
      </MenuContainer>
      
      <InfoContainer>
        <Title>{book.title}</Title>
        <Author>{book.author}</Author>
        <MetaInfo>
          <Status free={book.price === 0 || book.price === undefined}>
            {book.price === 0 || book.price === undefined ? 'FREE' : '유료'}
          </Status>
          {book.lastOpened && (
            <LastOpened>{formatDate(book.lastOpened)}</LastOpened>
          )}
        </MetaInfo>
      </InfoContainer>
    </Card>
  );
};

export default BookCard; 