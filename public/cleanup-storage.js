// localStorage 용량 초과 문제 해결을 위한 긴급 정리 스크립트
// 브라우저 콘솔에서 실행 가능

(function() {
  console.log('=== E-Reader 저장 공간 정리 도구 ===');
  
  // 현재 localStorage 사용량 체크
  function getStorageSize() {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length;
      }
    }
    return (totalSize / 1024).toFixed(2); // KB 단위
  }
  
  console.log(`현재 localStorage 사용량: ${getStorageSize()} KB`);
  
  // 1. 오래된 읽기 기록 정리
  function cleanupReadingData() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('reader-position-') || key.startsWith('reader-settings-'))) {
        keysToRemove.push(key);
      }
    }
    
    // 최근 5개만 유지하고 나머지 삭제
    if (keysToRemove.length > 5) {
      const toDelete = keysToRemove.slice(5);
      toDelete.forEach(key => localStorage.removeItem(key));
      console.log(`${toDelete.length}개의 읽기 기록이 정리되었습니다.`);
    } else {
      console.log('정리할 읽기 기록이 없습니다.');
    }
  }
  
  // 2. 대용량 책 데이터 정리
  function cleanupBooksData() {
    try {
      const booksData = localStorage.getItem('ereader-books');
      if (booksData) {
        const books = JSON.parse(booksData);
        
        // 파일 데이터 제거하고 메타데이터만 유지
        const cleanedBooks = books.map(book => {
          const { fileData, content, ...metadata } = book;
          return {
            ...metadata,
            hasFileData: !!fileData,
            fileSize: book.size || 0,
            // 대용량 데이터 제거 표시
            contentRemoved: !!(fileData || content)
          };
        });
        
        localStorage.setItem('ereader-books', JSON.stringify(cleanedBooks));
        console.log(`${books.length}개 책의 대용량 데이터가 정리되었습니다.`);
        
        // 정리 후 크기 비교
        const originalSize = booksData.length;
        const cleanedSize = JSON.stringify(cleanedBooks).length;
        const savedSpace = ((originalSize - cleanedSize) / 1024).toFixed(2);
        console.log(`${savedSpace} KB의 공간이 확보되었습니다.`);
      }
    } catch (error) {
      console.error('책 데이터 정리 중 오류:', error);
    }
  }
  
  // 3. 암호화된 대용량 데이터 정리
  function cleanupEncryptedData() {
    const chatData = localStorage.getItem('ereader-chats');
    const highlightData = localStorage.getItem('ereader-highlights');
    
    let cleanedSize = 0;
    
    if (chatData && chatData.length > 50000) { // 50KB 이상인 경우
      localStorage.removeItem('ereader-chats');
      cleanedSize += chatData.length;
      console.log('대용량 채팅 데이터가 정리되었습니다.');
    }
    
    if (highlightData && highlightData.length > 50000) { // 50KB 이상인 경우
      localStorage.removeItem('ereader-highlights');
      cleanedSize += highlightData.length;
      console.log('대용량 하이라이트 데이터가 정리되었습니다.');
    }
    
    if (cleanedSize > 0) {
      console.log(`암호화된 데이터에서 ${(cleanedSize / 1024).toFixed(2)} KB 정리되었습니다.`);
    }
  }
  
  // 정리 실행
  console.log('\n--- 정리 시작 ---');
  cleanupReadingData();
  cleanupBooksData();
  cleanupEncryptedData();
  
  console.log(`\n정리 완료! 현재 localStorage 사용량: ${getStorageSize()} KB`);
  console.log('페이지를 새로고침하여 변경사항을 확인하세요.');
  
})(); 