class TempFileServer {
  static serverPort = 3001;
  static isRunning = false;
  static activeFiles = new Map();

  // 임시 파일 데이터를 저장하고 로컬 URL 생성
  static async createTempUrl(fileData, fileName) {
    try {
      // ArrayBuffer를 Base64로 변환
      let base64Data;
      
      if (fileData instanceof ArrayBuffer) {
        const bytes = new Uint8Array(fileData);
        base64Data = btoa(String.fromCharCode(...bytes));
      } else if (fileData instanceof Uint8Array) {
        base64Data = btoa(String.fromCharCode(...fileData));
      } else if (fileData instanceof Blob) {
        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        base64Data = btoa(String.fromCharCode(...bytes));
      } else {
        throw new Error('지원되지 않는 파일 데이터 형식');
      }

      // 임시 ID 생성
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // localStorage에 임시 저장 (용량 제한 있지만 테스트용)
      const tempKey = `temp_file_${tempId}`;
      
      try {
        localStorage.setItem(tempKey, base64Data);
        console.log('✅ localStorage에 임시 파일 저장:', tempKey);
      } catch (storageError) {
        console.warn('⚠️ localStorage 저장 실패:', storageError);
        // localStorage 실패 시 메모리에 저장
        this.activeFiles.set(tempId, base64Data);
      }

      // 커스텀 프로토콜 URL 생성
      const tempUrl = `${window.location.origin}/temp-file/${tempId}.epub`;
      
      return { tempUrl, tempId, cleanup: () => this.cleanup(tempId) };
      
    } catch (error) {
      console.error('❌ 임시 URL 생성 실패:', error);
      throw error;
    }
  }

  // Service Worker로 임시 파일 서빙
  static async setupTempFileHandler() {
    if ('serviceWorker' in navigator) {
      try {
        // 임시 파일 처리용 Service Worker 등록
        const registration = await navigator.serviceWorker.register('/temp-file-worker.js');
        await navigator.serviceWorker.ready;
        
        console.log('✅ 임시 파일 Service Worker 등록 완료');
        return true;
      } catch (error) {
        console.warn('⚠️ Service Worker 등록 실패:', error);
        return false;
      }
    }
    return false;
  }

  // 데이터 제공 API
  static getTempFileData(tempId) {
    // localStorage에서 먼저 확인
    const tempKey = `temp_file_${tempId}`;
    const data = localStorage.getItem(tempKey);
    
    if (data) {
      return data;
    }
    
    // 메모리에서 확인
    return this.activeFiles.get(tempId);
  }

  // 정리
  static cleanup(tempId) {
    const tempKey = `temp_file_${tempId}`;
    
    try {
      localStorage.removeItem(tempKey);
    } catch (error) {
      console.warn('⚠️ localStorage 정리 실패:', error);
    }
    
    this.activeFiles.delete(tempId);
    console.log('🧹 임시 파일 정리 완료:', tempId);
  }

  // 모든 임시 파일 정리
  static cleanupAll() {
    // localStorage의 모든 임시 파일 제거
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('temp_file_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('⚠️ localStorage 정리 실패:', error);
      }
    });
    
    // 메모리 정리
    this.activeFiles.clear();
    
    console.log('🧹 모든 임시 파일 정리 완료');
  }
}

export default TempFileServer; 