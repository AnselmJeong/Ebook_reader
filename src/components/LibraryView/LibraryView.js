import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

import { useBooks } from '../../context/BookContext';
import BookCard from './BookCard';
import BookUpload from './BookUpload';

const Container = styled.div`
  width: 100%;
  height: 100vh;
  background: #fafafa;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Header = styled.div`
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const LeftHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
`;

const LogoIcon = styled.div`
  width: 8px;
  height: 8px;
  background: #333;
  border-radius: 2px;
`;

const RightHeader = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
`;

const ImportButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: linear-gradient(135deg, #45a049, #388e3c);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff6b6b, #feca57);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
`;

const Content = styled.div`
  flex: 1;
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  overflow: visible;
`;

const PageTitle = styled.h1`
  color: #333;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 40px 0;
`;

const Section = styled.div`
  margin-bottom: 50px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
`;

const ShowAllButton = styled.button`
  background: none;
  border: none;
  color: #666;
  padding: 4px 0;
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
  transition: color 0.2s ease;
  
  &:hover {
    color: #333;
  }
`;

const BooksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #666;
  padding: 60px 20px;
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.3;
`;

const EmptyStateText = styled.p`
  font-size: 1.2rem;
  margin-bottom: 30px;
  color: #666;
`;

const MainSearchContainer = styled.div`
  margin-bottom: 40px;
`;

const MainSearchInput = styled.input`
  width: 100%;
  padding: 16px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  color: #333;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  &::placeholder {
    color: #999;
  }
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 2px 12px rgba(0, 123, 255, 0.1);
  }
`;

const LibraryView = () => {
  const navigate = useNavigate();
  const { books, getMostPopular, getRecentlyAdded, isLoading, extractCoverForExistingBooks, updateMetadataForExistingBooks } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [isExtractingCovers, setIsExtractingCovers] = useState(false);
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mostPopular = getMostPopular();
  const recentlyAdded = getRecentlyAdded();

  const handleBookClick = (bookId) => {
    navigate(`/reader/${bookId}`);
  };

  const handleAddBook = () => {
    setShowUpload(true);
  };

  const handleExtractCovers = async () => {
    if (isExtractingCovers) return;
    
    const booksNeedingCovers = books.filter(book => 
      book.type === 'epub' && !book.coverImage
    );
    
    if (booksNeedingCovers.length === 0) {
      alert('모든 EPUB 책에 이미 표지가 있습니다.');
      return;
    }
    
    const confirmed = window.confirm(
      `${booksNeedingCovers.length}권의 EPUB 책에서 표지를 추출하시겠습니까?\n\n` +
      `이 작업은 몇 분 정도 소요될 수 있습니다.`
    );
    
    if (confirmed) {
      setIsExtractingCovers(true);
      try {
        await extractCoverForExistingBooks();
        alert('표지 추출이 완료되었습니다!');
      } catch (error) {
        alert('표지 추출 중 오류가 발생했습니다: ' + error.message);
      } finally {
        setIsExtractingCovers(false);
      }
    }
  };

  const handleUpdateMetadata = async () => {
    if (isUpdatingMetadata) return;
    
    const booksNeedingMetadata = books.filter(book => 
      book.type === 'epub' && (
        book.author === '알 수 없음' || 
        !book.publisher || 
        !book.language ||
        !book.description
      )
    );
    
    if (booksNeedingMetadata.length === 0) {
      alert('모든 EPUB 책의 메타데이터가 이미 완전합니다.');
      return;
    }
    
    const confirmed = window.confirm(
      `${booksNeedingMetadata.length}권의 EPUB 책에서 메타데이터를 업데이트하시겠습니까?\n\n` +
      `제목, 저자, 출판사, 언어, 설명 등의 정보를 추출합니다.\n` +
      `이 작업은 몇 분 정도 소요될 수 있습니다.`
    );
    
    if (confirmed) {
      setIsUpdatingMetadata(true);
      try {
        await updateMetadataForExistingBooks();
        alert('메타데이터 업데이트가 완료되었습니다!');
      } catch (error) {
        alert('메타데이터 업데이트 중 오류가 발생했습니다: ' + error.message);
      } finally {
        setIsUpdatingMetadata(false);
      }
    }
  };




  if (isLoading) {
    return (
      <Container>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#666',
          fontSize: '1.2rem'
        }}>
          📚 저장소 초기화 중...
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <LeftHeader>
          <Logo>
            <LogoIcon />
            BookWise
          </Logo>
        </LeftHeader>
        
        <RightHeader>
          <ImportButton onClick={handleAddBook}>
            📚 책 추가하기
          </ImportButton>
          
          {books.some(book => book.type === 'epub' && !book.coverImage) && (
            <ImportButton 
              onClick={handleExtractCovers}
              disabled={isExtractingCovers}
              style={{
                background: isExtractingCovers ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none'
              }}
            >
              {isExtractingCovers ? '추출 중...' : '표지 추출'}
            </ImportButton>
          )}
          
          {books.some(book => book.type === 'epub' && (
            book.author === '알 수 없음' || 
            !book.publisher || 
            !book.language ||
            !book.description
          )) && (
            <ImportButton 
              onClick={handleUpdateMetadata}
              disabled={isUpdatingMetadata}
              style={{
                background: isUpdatingMetadata ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none'
              }}
            >
              {isUpdatingMetadata ? '업데이트 중...' : '메타데이터 업데이트'}
            </ImportButton>
          )}
          

          
          <UserAvatar>
            A
          </UserAvatar>
        </RightHeader>
      </Header>

      <Content>
        <PageTitle>My Library</PageTitle>
        
        <MainSearchContainer>
          <MainSearchInput
            type="text"
            placeholder="Search for books"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </MainSearchContainer>
        {books.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>📚</EmptyStateIcon>
            <EmptyStateText>
              아직 추가된 책이 없습니다.
            </EmptyStateText>
            <ImportButton onClick={handleAddBook}>
              📚 첫 번째 책 추가하기
            </ImportButton>
          </EmptyState>
        ) : (
          <>
            {searchQuery ? (
              <Section>
                <SectionHeader>
                  <SectionTitle>검색 결과: "{searchQuery}"</SectionTitle>
                </SectionHeader>
                <BooksGrid>
                  {filteredBooks.map(book => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onClick={() => handleBookClick(book.id)}
                    />
                  ))}
                </BooksGrid>
              </Section>
            ) : (
              <>
                {mostPopular.length > 0 && (
                  <Section>
                    <SectionHeader>
                      <SectionTitle>Most Popular</SectionTitle>
                      <ShowAllButton>Show all</ShowAllButton>
                    </SectionHeader>
                    <BooksGrid>
                      {mostPopular.map(book => (
                        <BookCard
                          key={book.id}
                          book={book}
                          onClick={() => handleBookClick(book.id)}
                        />
                      ))}
                    </BooksGrid>
                  </Section>
                )}

                {recentlyAdded.length > 0 && (
                  <Section>
                    <SectionHeader>
                      <SectionTitle>Recently Added</SectionTitle>
                      <ShowAllButton>Show all</ShowAllButton>
                    </SectionHeader>
                    <BooksGrid>
                      {recentlyAdded.map(book => (
                        <BookCard
                          key={book.id}
                          book={book}
                          onClick={() => handleBookClick(book.id)}
                        />
                      ))}
                    </BooksGrid>
                  </Section>
                )}

                {books.length > 0 && (
                  <Section>
                    <SectionHeader>
                      <SectionTitle>All Books</SectionTitle>
                    </SectionHeader>
                    <BooksGrid>
                      {books.map(book => (
                        <BookCard
                          key={book.id}
                          book={book}
                          onClick={() => handleBookClick(book.id)}
                        />
                      ))}
                    </BooksGrid>
                  </Section>
                )}
              </>
            )}
          </>
        )}
      </Content>

      {showUpload && (
        <BookUpload onClose={() => setShowUpload(false)} />
      )}
    </Container>
  );
};

export default LibraryView; 