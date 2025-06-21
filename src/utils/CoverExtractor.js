import JSZip from 'jszip';

export class CoverExtractor {
  static async extractCover(fileData) {
    try {
      console.log('📸 EPUB 표지 추출 시작...');
      
      // ArrayBuffer 준비
      let buffer;
      if (fileData instanceof ArrayBuffer) {
        buffer = fileData;
      } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
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

      // ZIP 파일 파싱
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      // 1. container.xml에서 OPF 파일 경로 찾기
      const containerXml = await zipContent.files['META-INF/container.xml']?.async('string');
      if (!containerXml) {
        throw new Error('container.xml을 찾을 수 없습니다');
      }

      const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
      if (!rootfileMatch) {
        throw new Error('OPF 파일 경로를 찾을 수 없습니다');
      }

      const opfPath = rootfileMatch[1];
      console.log('📋 OPF 파일 경로:', opfPath);

      // 2. OPF 파일에서 표지 정보 찾기
      const opfContent = await zipContent.files[opfPath]?.async('string');
      if (!opfContent) {
        throw new Error('OPF 파일을 읽을 수 없습니다');
      }

      // OPF 파일의 디렉토리 경로
      const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

      // 표지 이미지 찾기 방법들
      const coverMethods = [
        // 방법 1: meta name="cover" 찾기
        () => {
          const coverMetaMatch = opfContent.match(/<meta\s+name="cover"\s+content="([^"]+)"/i);
          if (coverMetaMatch) {
            const coverId = coverMetaMatch[1];
            const itemMatch = opfContent.match(new RegExp(`<item\\s+[^>]*id="${coverId}"[^>]*href="([^"]+)"`));
            if (itemMatch) {
              return opfDir + itemMatch[1];
            }
          }
          return null;
        },

        // 방법 2: properties="cover-image" 찾기
        () => {
          const coverMatch = opfContent.match(/<item\s+[^>]*properties="cover-image"[^>]*href="([^"]+)"/i);
          if (coverMatch) {
            return opfDir + coverMatch[1];
          }
          return null;
        },

        // 방법 3: 일반적인 표지 파일명 찾기
        () => {
          const commonNames = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif', 'cover.webp'];
          for (const name of commonNames) {
            const fullPath = opfDir + name;
            if (zipContent.files[fullPath]) {
              return fullPath;
            }
          }
          return null;
        },

        // 방법 4: 첫 번째 이미지 파일 사용
        () => {
          const imageMatch = opfContent.match(/<item\s+[^>]*href="([^"]+\.(jpg|jpeg|png|gif|webp))"/i);
          if (imageMatch) {
            return opfDir + imageMatch[1];
          }
          return null;
        }
      ];

      // 각 방법을 시도해서 표지 찾기
      let coverPath = null;
      for (const method of coverMethods) {
        coverPath = method();
        if (coverPath && zipContent.files[coverPath]) {
          console.log('📸 표지 이미지 발견:', coverPath);
          break;
        }
      }

      if (!coverPath || !zipContent.files[coverPath]) {
        console.warn('⚠️ 표지 이미지를 찾을 수 없습니다');
        return null;
      }

      // 3. 이미지 파일 추출
      const imageFile = zipContent.files[coverPath];
      const imageArrayBuffer = await imageFile.async('arraybuffer');
      
      // 4. 썸네일 생성
      const thumbnail = await this.createThumbnail(imageArrayBuffer, coverPath);
      
      console.log('✅ 표지 추출 완료');
      return thumbnail;

    } catch (error) {
      console.error('❌ 표지 추출 실패:', error);
      return null;
    }
  }

  static async createThumbnail(imageArrayBuffer, originalPath) {
    return new Promise((resolve, reject) => {
      // 타임아웃 설정 (10초)
      const timeout = setTimeout(() => {
        console.error('❌ 썸네일 생성 타임아웃');
        resolve(null);
      }, 10000);

      try {
        // 파일 크기 검증
        if (imageArrayBuffer.byteLength > 10 * 1024 * 1024) { // 10MB 제한
          console.warn('⚠️ 이미지 파일이 너무 큽니다:', imageArrayBuffer.byteLength);
          clearTimeout(timeout);
          resolve(null);
          return;
        }

        // Blob 생성
        const blob = new Blob([imageArrayBuffer], { 
          type: this.getMimeType(originalPath)
        });
        
        // URL 생성
        const url = URL.createObjectURL(blob);
        
        // Image 객체 생성
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 이벤트 핸들러가 이미 실행되었는지 추적
        let isHandled = false;

        // 이벤트 핸들러 정의
        const handleLoad = () => {
          if (isHandled) return;
          isHandled = true;
          
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          
          try {
            // 이미지 크기 검증
            if (img.width === 0 || img.height === 0) {
              console.error('❌ 유효하지 않은 이미지 크기');
              resolve(null);
              return;
            }
            
            // 썸네일 크기 계산 (최대 220x300, 비율 유지)
            const maxWidth = 220;
            const maxHeight = 300;
            let { width, height } = img;

            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.floor(width * ratio);
              height = Math.floor(height * ratio);
            }

            // 최소 크기 보장
            if (width < 1) width = 1;
            if (height < 1) height = 1;

            // 캔버스 크기 설정
            canvas.width = width;
            canvas.height = height;

            // 이미지 그리기
            ctx.drawImage(img, 0, 0, width, height);

            // Base64로 변환 (JPEG, 품질 0.8)
            const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            console.log('📐 썸네일 생성:', `${width}x${height}`);
            resolve(thumbnailDataUrl);

          } catch (canvasError) {
            console.error('❌ 캔버스 처리 실패:', canvasError);
            resolve(null);
          }
        };

        const handleError = () => {
          if (isHandled) return;
          isHandled = true;
          
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          console.error('❌ 이미지 로드 실패');
          resolve(null);
        };

        // 이벤트 리스너 등록
        img.onload = handleLoad;
        img.onerror = handleError;

        // 크로스 오리진 설정
        img.crossOrigin = 'anonymous';

        // 이미지 로드
        img.src = url;

      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ 썸네일 생성 실패:', error);
        resolve(null);
      }
    });
  }

  static getMimeType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
} 