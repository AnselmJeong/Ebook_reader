import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import { useBooks } from '../../context/BookContext';
import BookCard from './BookCard';
import BookUpload from './BookUpload';

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  background: #fafafa;
  overflow-y: auto;
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
  gap: 20px;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 10px 40px 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f8f9fa;
  color: #333;
  font-size: 0.9rem;
  width: 300px;
  
  &::placeholder {
    color: #999;
  }
  
  &:focus {
    outline: none;
    border-color: #007bff;
    background: white;
  }
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  right: 12px;
  color: #999;
  font-size: 0.9rem;
`;

const ImportButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f8f9fa;
    border-color: #ccc;
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
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
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
  const { books, getMostPopular, getRecentlyAdded, isLoading } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);

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
          <SearchContainer>
            <SearchInput
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchIcon />
          </SearchContainer>
          
          <ImportButton onClick={handleAddBook}>
            Import
          </ImportButton>
          
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
              첫 번째 책 추가하기
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