// EPUB 파일을 임시 서버로 제공하는 유틸리티
export class EpubServer {
  static activeUrls = new Map();

  static async createServerUrl(fileData, bookId) {
    try {
      
      // 기존 URL이 있으면 정리
      if (this.activeUrls.has(bookId)) {
        const oldUrl = this.activeUrls.get(bookId);
        URL.revokeObjectURL(oldUrl);
        this.activeUrls.delete(bookId);
      }

      // ArrayBuffer 확인
      let buffer;
      if (fileData instanceof ArrayBuffer) {
        buffer = fileData;
      } else if (fileData instanceof Uint8Array) {
        buffer = fileData.buffer;
      } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        // base64 변환
        const base64Data = fileData.split(',')[1];
        const binaryString = atob(base64Data);
        buffer = new ArrayBuffer(binaryString.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryString.length; i++) {
          view[i] = binaryString.charCodeAt(i);
        }
      } else {
        throw new Error('지원되지 않는 파일 형식');
      }

      // 특별한 MIME 타입과 헤더로 Blob 생성
      const blob = new Blob([buffer], { 
        type: 'application/epub+zip'
      });

      // URL 생성
      const url = URL.createObjectURL(blob);
      this.activeUrls.set(bookId, url);
      
      return url;

    } catch (error) {
      console.error('❌ 임시 서버 URL 생성 실패:', error);
      throw error;
    }
  }

  static revokeUrl(bookId) {
    if (this.activeUrls.has(bookId)) {
      const url = this.activeUrls.get(bookId);
      URL.revokeObjectURL(url);
      this.activeUrls.delete(bookId);
    }
  }

  static cleanup() {
    for (const [bookId, url] of this.activeUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeUrls.clear();
  }
} 