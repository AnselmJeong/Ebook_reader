import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import indexedDBStorage from '../utils/IndexedDBStorage';
import { CoverExtractor } from '../utils/CoverExtractor';
import { EpubMetadataExtractor } from '../utils/EpubMetadataExtractor';

const BookContext = createContext();

export const useBooks = () => {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error('useBooks must be used within a BookProvider');
  }
  return context;
};

export const BookProvider = ({ children }) => {
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState({ used: 0, available: 0, percentage: 0 });

  // 저장 공간 사용량 업데이트 함수를 useCallback으로 메모이제이션
  const updateStorageUsage = useCallback(async () => {
    try {
      const usage = await indexedDBStorage.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('저장 공간 사용량 조회 실패:', error);
    }
  }, []);

  // IndexedDB 초기화 및 데이터 로드 (한 번만 실행)
  useEffect(() => {
    let isMounted = true; // cleanup을 위한 플래그

    const initializeStorage = async () => {
      try {
        console.log('📚 앱 시작 - 빠른 로딩 모드');
        setIsLoading(true);
        
        // 1단계: 즉시 localStorage에서 메타데이터 로드 (빠른 시작)
        console.log('⚡ 1단계: localStorage 메타데이터 로드');
        await loadFromLocalStorage();
        
        if (isMounted) {
          console.log('✅ 1단계 완료 - 앱 사용 가능');
          // 강제로 로딩 종료
          setIsLoading(false);
          console.log('🔄 로딩 상태 강제 종료');
        }
        
        // 2단계: 백그라운드에서 IndexedDB 확인 및 업그레이드
        setTimeout(async () => {
          if (!isMounted) return;
          
          try {
            console.log('🔧 2단계: 백그라운드 IndexedDB 확인');
            
            // 2초 타임아웃으로 IndexedDB 초기화 시도
            await indexedDBStorage.init(2000);
            console.log('✅ IndexedDB 초기화 성공');
            
            // IndexedDB에서 데이터 확인
            const indexedBooks = await indexedDBStorage.getAllBooks();
            if (indexedBooks && indexedBooks.length > 0 && isMounted) {
              console.log(`📚 IndexedDB에서 ${indexedBooks.length}개 책 발견`);
              setBooks(indexedBooks);
              await updateStorageUsage();
            }
            
            // 마이그레이션 확인
            await checkMigration();
            
          } catch (indexedError) {
            console.warn('⚠️ IndexedDB 사용 불가:', indexedError.message);
            console.log('📝 localStorage 모드로 계속 진행');
          }
        }, 100); // 100ms 후 백그라운드 실행
        
      } catch (error) {
        console.error('❌ 초기화 실패:', error);
        if (isMounted) {
          setBooks([]);
          setIsLoading(false);
        }
      }
    };

    // localStorage에서 빠른 로딩
    const loadFromLocalStorage = async () => {
      try {
        const savedBooks = localStorage.getItem('ereader-books');
        console.log('🔍 localStorage 원본 데이터:', savedBooks ? 'exists' : 'null');
        
        if (savedBooks) {
          const parsedBooks = JSON.parse(savedBooks);
          console.log('📋 파싱된 책 수:', parsedBooks.length);
          
          // 파일 데이터 제외하고 메타데이터만
          const cleanedBooks = parsedBooks.map(book => {
            const { fileData, content, ...metadata } = book;
            return {
              ...metadata,
              hasFileData: !!(fileData || content),
              fileSize: book.size || 0,
              isFromLocalStorage: true
            };
          });
          
          console.log('🧹 정리된 책 수:', cleanedBooks.length);
          console.log('📖 첫 번째 책:', cleanedBooks[0]?.title);
          
          setBooks(cleanedBooks);
          console.log('✅ setBooks 호출 완료');
          
          // 상태 업데이트 확인을 위한 지연
          setTimeout(() => {
            console.log('🔄 상태 업데이트 확인용 타이머');
          }, 100);
          
        } else {
          console.log('📝 저장된 책 없음');
          setBooks([]);
        }
      } catch (error) {
        console.error('❌ localStorage 로드 실패:', error);
        setBooks([]);
      }
    };

    // 마이그레이션 확인 (백그라운드)
    const checkMigration = async () => {
      try {
        const hasLocalStorageData = localStorage.getItem('ereader-books');
        const migrationDone = localStorage.getItem('ereader-migration-done');
        
        if (hasLocalStorageData && !migrationDone) {
          console.log('📦 마이그레이션 필요 감지');
          
          setTimeout(async () => {
            try {
              const success = await indexedDBStorage.migrateFromLocalStorage();
              if (success && isMounted) {
                console.log('✅ 마이그레이션 완료');
                const newBooks = await indexedDBStorage.getAllBooks();
                if (newBooks && newBooks.length > 0) {
                  setBooks(newBooks);
                  await updateStorageUsage();
                }
              }
            } catch (migrationError) {
              console.error('❌ 마이그레이션 실패:', migrationError);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('❌ 마이그레이션 확인 실패:', error);
      }
    };

    initializeStorage();

    // cleanup 함수
    return () => {
      isMounted = false;
    };
  }, [updateStorageUsage]); // ESLint 경고 해결

  const addBook = useCallback(async (book) => {
    try {
      const newBook = {
        id: Date.now().toString(),
        ...book,
        addedDate: new Date().toISOString(),
        lastOpened: null,
        progress: 0
      };
      
      // 파일 크기 체크 및 경고
      if (book.size && book.size > 50 * 1024 * 1024) { // 50MB 이상
        const confirm = window.confirm(
          `파일 크기가 ${(book.size / 1024 / 1024).toFixed(1)}MB입니다. 계속 진행하시겠습니까?`
        );
        if (!confirm) return null;
      }
      
      console.log('📖 책 추가 시작:', newBook.title);
      
      // 먼저 React 상태 업데이트 (즉시 UI에 반영)
      setBooks(prev => [...prev, newBook]);
      console.log('✅ React 상태 업데이트 완료');
      
      // 백그라운드에서 IndexedDB에 저장
      try {
        console.log('💾 IndexedDB 저장 시작...');
        
        // 파일 데이터가 있는지 확인
        const fileData = book.fileData || book.content;
        if (!fileData) {
          console.warn('⚠️ 파일 데이터가 없음:', newBook.title);
        } else {
          console.log('📄 파일 데이터 크기:', fileData.length, '바이트');
        }
        
        // 완전한 책 객체 생성 (메타데이터 + 파일 데이터)
        const completeBook = {
          ...newBook,
          fileData: fileData,
          hasFileData: !!fileData
        };
        
        // IndexedDB에 완전한 책 정보 저장
        await indexedDBStorage.saveBook(completeBook);
        console.log('✅ IndexedDB 저장 완료 (메타데이터 + 파일 데이터)');
        
        // 백그라운드에서 EPUB 표지 추출 (EPUB 파일인 경우에만)
        if (book.type === 'epub') {
          setTimeout(async () => {
            try {
              console.log('📸 백그라운드 표지 추출 시작:', newBook.title);
              const coverImage = await CoverExtractor.extractCover(fileData);
              
              if (coverImage) {
                // IndexedDB에 표지 이미지 저장
                await indexedDBStorage.saveCoverImage(newBook.id, coverImage);
                
                // React 상태 업데이트
                setBooks(prev => prev.map(b => 
                  b.id === newBook.id 
                    ? { ...b, coverImage } 
                    : b
                ));
                
                console.log('✅ 표지 이미지 추출 및 저장 완료');
              } else {
                console.log('⚠️ 표지 이미지를 찾을 수 없음');
              }
            } catch (coverError) {
              console.warn('⚠️ 표지 추출 실패 (무시됨):', coverError.message);
            }
          }, 1000); // 1초 후 백그라운드에서 실행
        }
        
        // 저장 공간 사용량 업데이트
        await updateStorageUsage();
        
      } catch (storageError) {
        console.error('❌ IndexedDB 저장 실패:', storageError);
        
        // 심각한 오류 - UI에서 책 제거
        setBooks(prev => prev.filter(b => b.id !== newBook.id));
        
        if (storageError.name === 'QuotaExceededError') {
          alert(`저장 공간이 부족합니다. 
현재 사용량: ${storageUsage.used}MB / ${storageUsage.available}MB
일부 책을 삭제하거나 저장 공간을 정리해주세요.`);
        } else {
          alert(`책 저장 중 오류가 발생했습니다: ${storageError.message}`);
        }
        
        return null;
      }
      
      console.log(`✅ 책 추가 완료: ${newBook.title} (${(book.size / 1024 / 1024).toFixed(2)} MB)`);
      return newBook;
      
    } catch (error) {
      console.error('❌ 책 추가 실패:', error);
      
      if (error.name === 'QuotaExceededError') {
        alert(`저장 공간이 부족합니다. 
현재 사용량: ${storageUsage.used}MB / ${storageUsage.available}MB
일부 책을 삭제하거나 저장 공간을 정리해주세요.`);
      } else {
        alert('책 추가 중 오류가 발생했습니다.');
      }
      
      return null;
    }
  }, [updateStorageUsage, storageUsage.used, storageUsage.available]);

  const removeBook = useCallback(async (bookId) => {
    try {
      await indexedDBStorage.deleteBook(bookId);
      setBooks(prev => prev.filter(book => book.id !== bookId));
      await updateStorageUsage();
      console.log(`책 삭제 완료: ${bookId}`);
    } catch (error) {
      console.error('책 삭제 실패:', error);
      alert('책 삭제 중 오류가 발생했습니다.');
    }
  }, [updateStorageUsage]);

  const updateBook = useCallback(async (bookId, updates) => {
    try {
      const updatedBook = books.find(book => book.id === bookId);
      if (!updatedBook) return;
      
      const newBookData = { ...updatedBook, ...updates };
      await indexedDBStorage.saveBookMetadata(newBookData);
      
      setBooks(prev => prev.map(book => 
        book.id === bookId ? newBookData : book
      ));
    } catch (error) {
      console.error('책 업데이트 실패:', error);
    }
  }, [books]);

  const getBookById = useCallback(async (bookId) => {
    // 먼저 메모리에서 찾기
    const memoryBook = books.find(book => book.id === bookId);
    if (memoryBook) {
      return memoryBook;
    }
    
    // 메모리에 없으면 IndexedDB에서 직접 가져오기 (새로고침 시)
    try {
      console.log('🔄 메모리에 없음, IndexedDB에서 책 메타데이터 로드:', bookId);
      const bookFromDB = await indexedDBStorage.getBook(bookId);
      if (bookFromDB) {
        console.log('✅ IndexedDB에서 책 메타데이터 발견:', bookFromDB.title);
        return bookFromDB;
      }
    } catch (error) {
      console.error('❌ IndexedDB에서 책 메타데이터 로드 실패:', error);
    }
    
    return null;
  }, [books]);

  // IndexedDB에서 파일 데이터와 함께 책 정보 반환
  const getBookWithFile = useCallback(async (bookId) => {
    console.log('🔍 getBookWithFile 시작:', bookId);
    
    try {
      // 1. 메타데이터 확인
      const book = books.find(book => book.id === bookId);
      if (!book) {
        console.error('❌ 책 메타데이터를 찾을 수 없음 ID:', bookId);
        return null;
      }
      
      console.log('📋 메타데이터 발견:', book.title);
      
      // 2. IndexedDB에서 파일 데이터 로드 (bookFiles 테이블에서)
      try {
        console.log('🗄️ IndexedDB에서 파일 데이터 로드 시도...');
        const fileData = await indexedDBStorage.getBookFile(bookId);
        
        if (fileData && fileData.fileData) {
          console.log('✅ IndexedDB에서 파일 데이터 발견');
          console.log('📊 파일 데이터 타입:', typeof fileData.fileData);
          console.log('📊 파일 크기:', fileData.fileData.byteLength || fileData.fileData.length || 'unknown');
          
          return {
            ...book,
            fileData: fileData.fileData
          };
        } else {
          console.warn('⚠️ IndexedDB에 파일 데이터 없음');
          return {
            ...book,
            fileData: null
          };
        }
      } catch (dbError) {
        console.error('❌ IndexedDB 오류:', dbError);
        return {
          ...book,
          fileData: null
        };
      }
    } catch (error) {
      console.error('❌ getBookWithFile 전체 오류:', error);
      return null;
    }
  }, [books]);



  // 북마크 저장 함수
  const saveBookmark = useCallback(async (bookId, bookmarkData) => {
    try {
      await indexedDBStorage.saveBookmark(bookId, bookmarkData);
      console.log(`🔖 북마크 저장 완료: ${bookId}`);
    } catch (error) {
      console.error('❌ 북마크 저장 실패:', error);
      throw error;
    }
  }, []);

  // 북마크 조회 함수
  const getBookmark = useCallback(async (bookId) => {
    try {
      const bookmark = await indexedDBStorage.getBookmark(bookId);
      return bookmark;
    } catch (error) {
      console.error('❌ 북마크 조회 실패:', error);
      return null;
    }
  }, []);

  // 모든 북마크 조회 함수
  const getAllBookmarks = useCallback(async () => {
    try {
      return await indexedDBStorage.getAllBookmarks();
    } catch (error) {
      console.error('❌ 모든 북마크 조회 실패:', error);
      return [];
    }
  }, []);

  const getMostPopular = useCallback(() => {
    return books
      .filter(book => book.lastOpened)
      .sort((a, b) => new Date(b.lastOpened) - new Date(a.lastOpened))
      .slice(0, 6);
  }, [books]);

  const getRecentlyAdded = useCallback(() => {
    return books
      .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
      .slice(0, 6);
  }, [books]);

  // 저장 공간 정리
  const cleanupStorage = useCallback(async () => {
    try {
      const success = await indexedDBStorage.cleanup();
      if (success) {
        // 책 목록 새로고침
        const updatedBooks = await indexedDBStorage.getAllBooks();
        setBooks(updatedBooks || []);
        await updateStorageUsage();
        
        alert('저장 공간 정리가 완료되었습니다.');
      }
    } catch (error) {
      console.error('저장 공간 정리 실패:', error);
      alert('저장 공간 정리 중 오류가 발생했습니다.');
    }
  }, [updateStorageUsage]);

  // 읽기 설정 관리
  const saveReadingSettings = useCallback(async (bookId, settings) => {
    try {
      await indexedDBStorage.saveSettings(bookId, settings);
    } catch (error) {
      console.error('읽기 설정 저장 실패:', error);
    }
  }, []);

  const getReadingSettings = useCallback(async (bookId) => {
    try {
      return await indexedDBStorage.getSettings(bookId);
    } catch (error) {
      console.error('읽기 설정 로드 실패:', error);
      return null;
    }
  }, []);

  // 🔄 기존 책들의 표지 추출 함수
  const extractCoverForExistingBooks = async () => {
    try {
      console.log('🔄 기존 책들의 표지 추출 시작...');
      
      // EPUB 파일이면서 표지가 없는 책들 찾기
      const booksNeedingCovers = books.filter(book => 
        book.type === 'epub' && !book.coverImage
      );
      
      if (booksNeedingCovers.length === 0) {
        console.log('✅ 표지 추출이 필요한 책이 없습니다.');
        return;
      }
      
      console.log(`📚 ${booksNeedingCovers.length}권의 책에서 표지 추출 시작...`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const book of booksNeedingCovers) {
        try {
          console.log(`📖 "${book.title}" 표지 추출 중...`);
          
          // IndexedDB에서 파일 데이터 가져오기
          const bookWithFile = await indexedDBStorage.getBook(book.id);
          
          if (!bookWithFile || !bookWithFile.fileData) {
            console.warn(`⚠️ "${book.title}" 파일 데이터를 찾을 수 없음`);
            failCount++;
            continue;
          }
          
          // 표지 추출
          const coverImage = await CoverExtractor.extractCover(bookWithFile.fileData);
          
          if (coverImage) {
            // IndexedDB에 표지 이미지 저장
            await indexedDBStorage.saveCoverImage(book.id, coverImage);
            
            // React 상태 업데이트
            setBooks(prev => prev.map(b => 
              b.id === book.id 
                ? { ...b, coverImage }
                : b
            ));
            
            console.log(`✅ "${book.title}" 표지 추출 완료`);
            successCount++;
          } else {
            console.warn(`⚠️ "${book.title}" 표지를 찾을 수 없음`);
            failCount++;
          }
          
          // 다음 책 처리 전 잠시 대기 (UI 블로킹 방지)
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`❌ "${book.title}" 표지 추출 실패:`, error);
          failCount++;
        }
      }
      
      console.log(`🎉 표지 추출 완료: 성공 ${successCount}권, 실패 ${failCount}권`);
      
      if (successCount > 0) {
        // 저장 공간 사용량 업데이트
        await updateStorageUsage();
      }
      
    } catch (error) {
      console.error('❌ 기존 책 표지 추출 중 오류:', error);
    }
  };



  // 📋 기존 EPUB 책들의 메타데이터 업데이트 함수
  const updateMetadataForExistingBooks = async () => {
    try {
      console.log('📋 기존 책들의 메타데이터 업데이트 시작...');
      
      // EPUB 파일이면서 메타데이터가 부족한 책들 찾기
      const booksNeedingMetadata = books.filter(book => 
        book.type === 'epub' && (
          book.author === '알 수 없음' || 
          !book.publisher || 
          !book.language ||
          !book.description
        )
      );
      
      if (booksNeedingMetadata.length === 0) {
        console.log('✅ 메타데이터 업데이트가 필요한 책이 없습니다.');
        return;
      }
      
      console.log(`📚 ${booksNeedingMetadata.length}권의 책 메타데이터 업데이트 시작...`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const book of booksNeedingMetadata) {
        try {
          console.log(`📋 "${book.title}" 메타데이터 추출 중...`);
          
          // IndexedDB에서 파일 데이터 가져오기
          const bookWithFile = await indexedDBStorage.getBook(book.id);
          
          if (!bookWithFile || !bookWithFile.fileData) {
            console.warn(`⚠️ "${book.title}" 파일 데이터를 찾을 수 없음`);
            failCount++;
            continue;
          }
          
          // 메타데이터 추출
          const metadata = await EpubMetadataExtractor.extractMetadata(bookWithFile.fileData);
          
          // 업데이트할 정보 확인
          const updates = {};
          let hasUpdates = false;
          
          if (metadata.title && metadata.title !== book.title) {
            updates.title = metadata.title;
            hasUpdates = true;
          }
          
          if (metadata.author && metadata.author !== book.author) {
            updates.author = metadata.author;
            hasUpdates = true;
          }
          
          if (metadata.publisher && !book.publisher) {
            updates.publisher = metadata.publisher;
            hasUpdates = true;
          }
          
          if (metadata.language && !book.language) {
            updates.language = metadata.language;
            hasUpdates = true;
          }
          
          if (metadata.description && !book.description) {
            updates.description = metadata.description;
            hasUpdates = true;
          }
          
          if (hasUpdates) {
            const updatedBook = { ...book, ...updates };
            
            // IndexedDB에 업데이트된 메타데이터 저장
            await indexedDBStorage.saveBookMetadata(updatedBook);
            
            // React 상태 업데이트
            setBooks(prev => prev.map(b => 
              b.id === book.id ? updatedBook : b
            ));
            
            console.log(`✅ "${book.title}" 메타데이터 업데이트 완료:`, updates);
            successCount++;
          } else {
            console.log(`📋 "${book.title}" 업데이트할 메타데이터 없음`);
          }
          
          // 다음 책 처리 전 잠시 대기 (UI 블로킹 방지)
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ "${book.title}" 메타데이터 업데이트 실패:`, error);
          failCount++;
        }
      }
      
      console.log(`🎉 메타데이터 업데이트 완료: 성공 ${successCount}권, 실패 ${failCount}권`);
      
    } catch (error) {
      console.error('❌ 기존 책 메타데이터 업데이트 중 오류:', error);
    }
  };

  const value = {
    books,
    currentBook,
    setCurrentBook,
    isLoading,
    storageUsage,
    addBook,
    removeBook,
    updateBook,
    getBookById,
    getBookWithFile,
    saveBookmark,
    getBookmark,
    getAllBookmarks,
    getMostPopular,
    getRecentlyAdded,
    cleanupStorage,
    saveReadingSettings,
    getReadingSettings,
    updateStorageUsage,
    extractCoverForExistingBooks,
    updateMetadataForExistingBooks
  };

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  );
}; 