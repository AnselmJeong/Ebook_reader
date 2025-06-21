import JSZip from 'jszip';

export class EpubMetadataExtractor {
  /**
   * EPUB 파일에서 메타데이터를 추출합니다
   * @param {ArrayBuffer|Blob} fileData - EPUB 파일 데이터
   * @returns {Promise<Object>} 메타데이터 객체
   */
  static async extractMetadata(fileData) {
    try {
      console.log('📋 EPUB 메타데이터 추출 시작...');
      
      // JSZip으로 EPUB 파일 열기
      const zip = new JSZip();
      await zip.loadAsync(fileData);
      
      // 1. container.xml에서 OPF 파일 경로 찾기
      const containerXml = await zip.file('META-INF/container.xml')?.async('string');
      if (!containerXml) {
        throw new Error('container.xml을 찾을 수 없습니다');
      }
      
      const opfPath = this.extractOpfPath(containerXml);
      console.log('📁 OPF 파일 경로:', opfPath);
      
      // 2. OPF 파일에서 메타데이터 추출
      const opfContent = await zip.file(opfPath)?.async('string');
      if (!opfContent) {
        throw new Error('OPF 파일을 찾을 수 없습니다');
      }
      
      const metadata = this.parseOpfMetadata(opfContent);
      console.log('✅ 메타데이터 추출 완료:', metadata);
      
      return metadata;
      
    } catch (error) {
      console.error('❌ 메타데이터 추출 실패:', error);
      return {
        title: null,
        author: null,
        publisher: null,
        language: null,
        description: null,
        publishedDate: null,
        identifier: null,
        error: error.message
      };
    }
  }
  
  /**
   * container.xml에서 OPF 파일 경로를 추출합니다
   * @param {string} containerXml - container.xml 내용
   * @returns {string} OPF 파일 경로
   */
  static extractOpfPath(containerXml) {
    try {
      // XML 파싱을 위한 DOMParser 사용
      const parser = new DOMParser();
      const doc = parser.parseFromString(containerXml, 'text/xml');
      
      // rootfile 요소에서 full-path 속성 찾기
      const rootfile = doc.querySelector('rootfile[media-type="application/oebps-package+xml"]');
      if (!rootfile) {
        throw new Error('OPF rootfile을 찾을 수 없습니다');
      }
      
      const fullPath = rootfile.getAttribute('full-path');
      if (!fullPath) {
        throw new Error('OPF full-path 속성을 찾을 수 없습니다');
      }
      
      return fullPath;
      
    } catch (error) {
      console.error('❌ OPF 경로 추출 실패:', error);
      // 폴백: 일반적인 경로들 시도
      return 'OEBPS/content.opf';
    }
  }
  
  /**
   * OPF 파일에서 메타데이터를 파싱합니다
   * @param {string} opfContent - OPF 파일 내용
   * @returns {Object} 메타데이터 객체
   */
  static parseOpfMetadata(opfContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(opfContent, 'text/xml');
      
      // 네임스페이스 처리
      const metadata = doc.querySelector('metadata');
      if (!metadata) {
        throw new Error('metadata 요소를 찾을 수 없습니다');
      }
      
      const result = {
        title: null,
        author: null,
        publisher: null,
        language: null,
        description: null,
        publishedDate: null,
        identifier: null
      };
      
      // 제목 추출 (dc:title)
      const titleElement = metadata.querySelector('title, [name="title"], dc\\:title, *|title');
      if (titleElement) {
        result.title = this.cleanText(titleElement.textContent);
      }
      
      // 저자 추출 (dc:creator)
      const creatorElements = metadata.querySelectorAll('creator, [name="creator"], dc\\:creator, *|creator');
      if (creatorElements.length > 0) {
        const authors = Array.from(creatorElements).map(el => this.cleanText(el.textContent)).filter(Boolean);
        result.author = authors.join(', ');
      }
      
      // 출판사 추출 (dc:publisher)
      const publisherElement = metadata.querySelector('publisher, [name="publisher"], dc\\:publisher, *|publisher');
      if (publisherElement) {
        result.publisher = this.cleanText(publisherElement.textContent);
      }
      
      // 언어 추출 (dc:language)
      const languageElement = metadata.querySelector('language, [name="language"], dc\\:language, *|language');
      if (languageElement) {
        result.language = this.cleanText(languageElement.textContent);
      }
      
      // 설명 추출 (dc:description)
      const descriptionElement = metadata.querySelector('description, [name="description"], dc\\:description, *|description');
      if (descriptionElement) {
        result.description = this.cleanText(descriptionElement.textContent);
      }
      
      // 출간일 추출 (dc:date)
      const dateElement = metadata.querySelector('date, [name="date"], dc\\:date, *|date');
      if (dateElement) {
        result.publishedDate = this.cleanText(dateElement.textContent);
      }
      
      // 식별자 추출 (dc:identifier)
      const identifierElement = metadata.querySelector('identifier, [name="identifier"], dc\\:identifier, *|identifier');
      if (identifierElement) {
        result.identifier = this.cleanText(identifierElement.textContent);
      }
      
      // 폴백: meta 태그에서 추출 시도
      if (!result.title) {
        const metaTitle = metadata.querySelector('meta[name="title"], meta[property="dc:title"]');
        if (metaTitle) {
          result.title = this.cleanText(metaTitle.getAttribute('content') || metaTitle.textContent);
        }
      }
      
      if (!result.author) {
        const metaAuthor = metadata.querySelector('meta[name="author"], meta[name="creator"], meta[property="dc:creator"]');
        if (metaAuthor) {
          result.author = this.cleanText(metaAuthor.getAttribute('content') || metaAuthor.textContent);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ OPF 메타데이터 파싱 실패:', error);
      return {
        title: null,
        author: null,
        publisher: null,
        language: null,
        description: null,
        publishedDate: null,
        identifier: null,
        parseError: error.message
      };
    }
  }
  
  /**
   * 텍스트를 정리합니다 (공백 제거, 특수문자 처리)
   * @param {string} text - 정리할 텍스트
   * @returns {string} 정리된 텍스트
   */
  static cleanText(text) {
    if (!text) return null;
    
    return text
      .replace(/\s+/g, ' ')  // 연속된 공백을 하나로
      .replace(/[\r\n\t]/g, ' ')  // 개행문자를 공백으로
      .trim()  // 앞뒤 공백 제거
      .replace(/^["']|["']$/g, '')  // 앞뒤 따옴표 제거
      || null;
  }
  
  /**
   * 간단한 메타데이터 추출 (빠른 버전)
   * @param {ArrayBuffer|Blob} fileData - EPUB 파일 데이터
   * @returns {Promise<Object>} 기본 메타데이터
   */
  static async extractBasicMetadata(fileData) {
    try {
      const zip = new JSZip();
      await zip.loadAsync(fileData);
      
      // container.xml 확인
      const containerExists = zip.file('META-INF/container.xml');
      if (!containerExists) {
        return { title: null, author: null, isValidEpub: false };
      }
      
      // 일반적인 OPF 경로들 시도
      const commonOpfPaths = [
        'OEBPS/content.opf',
        'EPUB/content.opf',
        'content.opf',
        'package.opf'
      ];
      
      for (const path of commonOpfPaths) {
        const opfFile = zip.file(path);
        if (opfFile) {
          const opfContent = await opfFile.async('string');
          const metadata = this.parseOpfMetadata(opfContent);
          return {
            title: metadata.title,
            author: metadata.author,
            isValidEpub: true
          };
        }
      }
      
      return { title: null, author: null, isValidEpub: true };
      
    } catch (error) {
      console.error('❌ 기본 메타데이터 추출 실패:', error);
      return { title: null, author: null, isValidEpub: false };
    }
  }
} 