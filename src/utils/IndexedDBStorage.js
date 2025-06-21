/**
 * IndexedDB를 사용한 대용량 E-book 저장 관리자
 * localStorage 대신 사용하여 수 GB의 데이터 저장 가능
 */

class IndexedDBStorage {
  constructor() {
    this.dbName = 'EReaderDB';
    this.version = 1;
    this.db = null;
    this.isInitializing = false;
    this.initPromise = null;
    
    // Object Store 이름들
    this.stores = {
      books: 'books',           // 책 메타데이터
      bookFiles: 'bookFiles',   // 책 파일 데이터 (큰 용량)
      settings: 'settings',     // 읽기 설정
      highlights: 'highlights', // 하이라이트
      chats: 'chats'           // AI 채팅 기록
    };
  }

  /**
   * 타임아웃이 있는 안전한 IndexedDB 초기화
   */
  async init(timeoutMs = 5000) {
    // 이미 초기화 중이면 기존 프로미스 반환
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // 이미 초기화되었으면 바로 반환
    if (this.db) {
      return this.db;
    }

    this.isInitializing = true;
    
    this.initPromise = new Promise((resolve, reject) => {
      let resolved = false;
      
      // 타임아웃 설정
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.isInitializing = false;
          console.error('⏰ IndexedDB 초기화 타임아웃');
          reject(new Error('IndexedDB 초기화 타임아웃'));
        }
      }, timeoutMs);

      try {
        const request = indexedDB.open(this.dbName, this.version);
        
        request.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.isInitializing = false;
            console.error('❌ IndexedDB 열기 실패:', request.error);
            reject(request.error);
          }
        };
        
        request.onsuccess = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.db = request.result;
            this.isInitializing = false;
            resolve(this.db);
          }
        };
        
        request.onupgradeneeded = (event) => {
          try {
            const db = event.target.result;
            
            // 책 메타데이터 스토어
            if (!db.objectStoreNames.contains(this.stores.books)) {
              const booksStore = db.createObjectStore(this.stores.books, { keyPath: 'id' });
              booksStore.createIndex('title', 'title', { unique: false });
              booksStore.createIndex('author', 'author', { unique: false });
              booksStore.createIndex('addedDate', 'addedDate', { unique: false });
            }
            
            // 책 파일 데이터 스토어 (큰 용량)
            if (!db.objectStoreNames.contains(this.stores.bookFiles)) {
              db.createObjectStore(this.stores.bookFiles, { keyPath: 'bookId' });
            }
            
            // 설정 스토어
            if (!db.objectStoreNames.contains(this.stores.settings)) {
              db.createObjectStore(this.stores.settings, { keyPath: 'id' });
            }
            
            // 하이라이트 스토어
            if (!db.objectStoreNames.contains(this.stores.highlights)) {
              const highlightsStore = db.createObjectStore(this.stores.highlights, { keyPath: 'id' });
              highlightsStore.createIndex('bookId', 'bookId', { unique: false });
            }
            
            // 채팅 스토어
            if (!db.objectStoreNames.contains(this.stores.chats)) {
              const chatsStore = db.createObjectStore(this.stores.chats, { keyPath: 'id' });
              chatsStore.createIndex('bookId', 'bookId', { unique: false });
            }
            
          } catch (upgradeError) {
            console.error('❌ 스키마 업그레이드 실패:', upgradeError);
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              this.isInitializing = false;
              reject(upgradeError);
            }
          }
        };
        
        request.onblocked = () => {
          console.warn('⚠️ IndexedDB 블록됨 - 다른 탭에서 DB 사용 중');
        };
        
      } catch (initError) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          this.isInitializing = false;
          console.error('❌ IndexedDB 초기화 중 오류:', initError);
          reject(initError);
        }
      }
    });

    try {
      const result = await this.initPromise;
      return result;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * DB 연결 상태 확인 및 재연결
   */
  async ensureConnection() {
    if (!this.db) {
      try {
        await this.init(3000); // 3초 타임아웃
      } catch (error) {
        console.error('❌ DB 재연결 실패:', error);
        throw new Error('IndexedDB 연결 실패');
      }
    }
  }

  /**
   * 안전한 트랜잭션 헬퍼
   */
  async getTransaction(storeNames, mode = 'readonly') {
    await this.ensureConnection();
    
    if (!this.db) {
      throw new Error('IndexedDB 연결이 없습니다.');
    }
    
    try {
      return this.db.transaction(storeNames, mode);
    } catch (error) {
      console.error('❌ 트랜잭션 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 책 메타데이터 저장
   */
  async saveBookMetadata(book) {
    const transaction = await this.getTransaction([this.stores.books], 'readwrite');
    const store = transaction.objectStore(this.stores.books);
    
    // 파일 데이터는 제외하고 메타데이터만 저장
    const { fileData, content, ...metadata } = book;
    const bookMetadata = {
      ...metadata,
      hasFileData: !!(fileData || content),
      savedAt: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(bookMetadata);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 책 파일 데이터 저장 (대용량)
   */
  async saveBookFile(bookId, fileData) {
    const transaction = await this.getTransaction([this.stores.bookFiles], 'readwrite');
    const store = transaction.objectStore(this.stores.bookFiles);
    
    const bookFile = {
      bookId,
      fileData,
      savedAt: new Date().toISOString(),
      size: new Blob([fileData]).size
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(bookFile);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 책 전체 정보 저장 (메타데이터 + 파일 데이터)
   */
  async saveBook(book) {
    
    try {
      // 1. 메타데이터 저장
      await this.saveBookMetadata(book);
      
      // 2. 파일 데이터가 있으면 저장
      if (book.fileData) {
        await this.saveBookFile(book.id, book.fileData);
      } else {
        console.warn('⚠️ 파일 데이터가 없어서 메타데이터만 저장됨');
      }
      
      return true;
    } catch (error) {
      console.error('❌ saveBook 실패:', error);
      throw error;
    }
  }

  /**
   * 모든 책 메타데이터 조회
   */
  async getAllBooks() {
    try {
      // DB 초기화 확인
      if (!this.db) {
        console.warn('⚠️ DB가 초기화되지 않음, 재초기화 시도');
        await this.init();
      }
      
      const transaction = await this.getTransaction([this.stores.books]);
      const store = transaction.objectStore(this.stores.books);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const result = request.result || [];
          resolve(result);
        };
        request.onerror = () => {
          console.error('❌ getAllBooks 오류:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('❌ getAllBooks 실패:', error);
      return []; // 빈 배열 반환
    }
  }

  /**
   * 책 메타데이터 조회
   */
  async getBookMetadata(bookId) {
    const transaction = await this.getTransaction([this.stores.books]);
    const store = transaction.objectStore(this.stores.books);
    
    return new Promise((resolve, reject) => {
      const request = store.get(bookId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 책 전체 정보 조회 (메타데이터 + 파일 데이터)
   */
  async getBook(bookId) {
    
    try {
      // 1. 메타데이터 조회
      const metadata = await this.getBookMetadata(bookId);
      if (!metadata) {
        console.warn('⚠️ 메타데이터 없음:', bookId);
        return null;
      }
      
      
      // 2. 파일 데이터 조회
      try {
        const fileData = await this.getBookFile(bookId);
        if (fileData && fileData.fileData) {
          return {
            ...metadata,
            fileData: fileData.fileData
          };
        } else {
          console.warn('⚠️ 파일 데이터 없음:', bookId);
          return {
            ...metadata,
            fileData: null
          };
        }
      } catch (fileError) {
        console.warn('⚠️ 파일 데이터 로드 실패:', fileError);
        return {
          ...metadata,
          fileData: null
        };
      }
    } catch (error) {
      console.error('❌ getBook 실패:', error);
      return null;
    }
  }

  /**
   * 책 파일 데이터 조회
   */
  async getBookFile(bookId) {
    const transaction = await this.getTransaction([this.stores.bookFiles]);
    const store = transaction.objectStore(this.stores.bookFiles);
    
    return new Promise((resolve, reject) => {
      const request = store.get(bookId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 책 삭제 (메타데이터 + 파일 데이터)
   */
  async deleteBook(bookId) {
    const transaction = await this.getTransaction([this.stores.books, this.stores.bookFiles], 'readwrite');
    
    const promises = [
      new Promise((resolve, reject) => {
        const request = transaction.objectStore(this.stores.books).delete(bookId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise((resolve, reject) => {
        const request = transaction.objectStore(this.stores.bookFiles).delete(bookId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ];
    
    await Promise.all(promises);
  }

  /**
   * 읽기 설정 저장
   */
  async saveSettings(bookId, settings) {
    const transaction = await this.getTransaction([this.stores.settings], 'readwrite');
    const store = transaction.objectStore(this.stores.settings);
    
    const settingsData = {
      id: `reader-settings-${bookId}`,
      bookId,
      settings,
      updatedAt: new Date().toISOString()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(settingsData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 읽기 설정 조회
   */
  async getSettings(bookId) {
    const transaction = await this.getTransaction([this.stores.settings]);
    const store = transaction.objectStore(this.stores.settings);
    
    return new Promise((resolve, reject) => {
      const request = store.get(`reader-settings-${bookId}`);
      request.onsuccess = () => resolve(request.result?.settings || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 저장 공간 사용량 조회
   */
  async getStorageUsage() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { used: 0, available: 0, percentage: 0 };
    }
    
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;
      
      return {
        used: Math.round(used / 1024 / 1024), // MB
        available: Math.round(available / 1024 / 1024), // MB
        percentage: Math.round(percentage)
      };
    } catch (error) {
      console.error('저장 공간 조회 실패:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * 데이터베이스 정리
   */
  async cleanup() {
    const confirmCleanup = window.confirm(
      '저장된 데이터를 정리하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
    );
    
    if (!confirmCleanup) return false;
    
    try {
      // 오래된 책들 정리 (30일 이상 열지 않은 책)
      const books = await this.getAllBooks();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const oldBooks = books.filter(book => {
        const lastOpened = book.lastOpened ? new Date(book.lastOpened) : new Date(book.addedDate);
        return lastOpened < thirtyDaysAgo;
      });
      
      for (const book of oldBooks) {
        await this.deleteBook(book.id);
      }
      
      return true;
    } catch (error) {
      console.error('정리 중 오류:', error);
      return false;
    }
  }

  /**
   * localStorage에서 IndexedDB로 데이터 마이그레이션
   */
  async migrateFromLocalStorage() {
    try {
      
      // 마이그레이션 상태 체크 (중복 실행 방지)
      const migrationFlag = localStorage.getItem('ereader-migration-done');
      if (migrationFlag) {
        return true;
      }
      
      // 책 데이터 마이그레이션
      const booksData = localStorage.getItem('ereader-books');
      if (booksData) {
        const books = JSON.parse(booksData);
        
        for (let i = 0; i < books.length; i++) {
          const book = books[i];
          
          try {
            // 메타데이터 저장
            await this.saveBookMetadata(book);
            
            // 파일 데이터가 있으면 별도 저장
            if (book.fileData || book.content) {
              await this.saveBookFile(book.id, book.fileData || book.content);
            }
          } catch (bookError) {
            console.error(`❌ 책 마이그레이션 실패: ${book.title}`, bookError);
            // 개별 책 실패는 무시하고 계속 진행
          }
        }
        
      }
      
      // 마이그레이션 완료 플래그 설정
      localStorage.setItem('ereader-migration-done', 'true');
      
      // 마이그레이션 완료 후 localStorage 정리 (일부만)
      const keysToRemove = ['ereader-books']; // 책 데이터만 제거
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
const indexedDBStorage = new IndexedDBStorage();

export default indexedDBStorage; 