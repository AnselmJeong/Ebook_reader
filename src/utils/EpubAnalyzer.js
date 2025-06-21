// EPUB 파일 구조 분석기
import JSZip from 'jszip';

export class EpubAnalyzer {
  static async analyzeEpub(fileData) {
    try {
      // 파일 데이터 유효성 검사
      if (!fileData) {
        throw new Error('파일 데이터가 없습니다');
      }

      // ArrayBuffer를 Uint8Array로 변환
      let buffer;
      if (fileData instanceof ArrayBuffer) {
        buffer = fileData;
      } else if (fileData instanceof Uint8Array) {
        buffer = fileData.buffer;
      } else if (fileData instanceof Blob) {
        buffer = await fileData.arrayBuffer();
      } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        // base64 데이터 변환
        const base64Data = fileData.split(',')[1];
        const binaryString = atob(base64Data);
        buffer = new ArrayBuffer(binaryString.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryString.length; i++) {
          view[i] = binaryString.charCodeAt(i);
        }
      } else {
        console.warn('⚠️ 지원되지 않는 파일 형식:', typeof fileData, fileData?.constructor?.name);
        throw new Error(`지원되지 않는 파일 형식: ${typeof fileData}`);
      }

      // 버퍼 크기 검사
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('빈 파일 데이터입니다');
      }

      // ZIP 파일 파싱
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);
      
      // 필수 파일들 확인
      const analysis = {
        isValid: true,
        files: Object.keys(zipContent.files),
        errors: [],
        warnings: []
      };

      // 1. mimetype 파일 확인
      if (!zipContent.files['mimetype']) {
        analysis.warnings.push('mimetype 파일이 없습니다');
      } else {
        const mimetype = await zipContent.files['mimetype'].async('string');
        if (mimetype.trim() !== 'application/epub+zip') {
          analysis.errors.push(`잘못된 mimetype: ${mimetype}`);
          analysis.isValid = false;
        }
      }

      // 2. META-INF/container.xml 확인
      if (!zipContent.files['META-INF/container.xml']) {
        analysis.errors.push('META-INF/container.xml 파일이 없습니다');
        analysis.isValid = false;
      } else {
        const containerXml = await zipContent.files['META-INF/container.xml'].async('string');
        
        // rootfile 경로 추출
        const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
        if (rootfileMatch) {
          const rootfilePath = rootfileMatch[1];
          analysis.rootfilePath = rootfilePath;
          
          // 3. OPF 파일 확인
          if (!zipContent.files[rootfilePath]) {
            analysis.errors.push(`OPF 파일을 찾을 수 없습니다: ${rootfilePath}`);
            analysis.isValid = false;
          } else {
            const opfContent = await zipContent.files[rootfilePath].async('string');
            analysis.opfContent = opfContent;
          }
        } else {
          analysis.errors.push('container.xml에서 rootfile 경로를 찾을 수 없습니다');
          analysis.isValid = false;
        }
      }

      // 4. 일반적인 EPUB 구조 확인
      const hasOEBPS = zipContent.files['OEBPS/'] || Object.keys(zipContent.files).some(f => f.startsWith('OEBPS/'));
      const hasContent = zipContent.files['content.opf'] || Object.keys(zipContent.files).some(f => f.endsWith('.opf'));
      
      return analysis;
    } catch (error) {
      console.error('❌ EPUB 분석 실패:', error);
      return {
        isValid: false,
        files: [],
        errors: [`분석 실패: ${error.message}`],
        warnings: []
      };
    }
  }
} 