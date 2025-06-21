/**
 * 긴급 복구 도구
 * 무한 로딩이나 기타 문제 시 사용자가 수동으로 실행할 수 있는 복구 함수들
 */

class EmergencyFix {
  /**
   * 모든 저장된 데이터 초기화 (마지막 수단)
   */
  static clearAllData() {
    const confirmClear = window.confirm(
      '⚠️ 경고: 모든 저장된 데이터가 삭제됩니다.\n\n' +
      '- 저장된 모든 책\n' +
      '- 읽기 기록\n' +
      '- AI 채팅 기록\n' +
      '- 하이라이트\n' +
      '- 설정\n\n' +
      '정말로 진행하시겠습니까?'
    );
    
    if (!confirmClear) return false;
    
    try {
      // localStorage 완전 정리
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('ereader-') || key.startsWith('reader-')) {
          localStorage.removeItem(key);
        }
      });
      
      // IndexedDB 삭제
      const deleteDB = indexedDB.deleteDatabase('EReaderDB');
      deleteDB.onsuccess = () => {
        console.log('✅ IndexedDB 삭제 완료');
        alert('데이터 정리가 완료되었습니다. 페이지를 새로고침해주세요.');
        window.location.reload();
      };
      
      deleteDB.onerror = () => {
        console.error('❌ IndexedDB 삭제 실패');
        alert('일부 데이터 정리에 실패했지만 계속 진행합니다. 페이지를 새로고침해주세요.');
        window.location.reload();
      };
      
      return true;
    } catch (error) {
      console.error('데이터 정리 실패:', error);
      alert('데이터 정리 중 오류가 발생했습니다.');
      return false;
    }
  }
  
  /**
   * 마이그레이션 상태 초기화
   */
  static resetMigration() {
    try {
      localStorage.removeItem('ereader-migration-done');
      console.log('✅ 마이그레이션 상태 초기화 완료');
      alert('마이그레이션 상태가 초기화되었습니다. 페이지를 새로고침해주세요.');
      window.location.reload();
      return true;
    } catch (error) {
      console.error('마이그레이션 상태 초기화 실패:', error);
      return false;
    }
  }
  
  /**
   * IndexedDB만 초기화 (localStorage는 유지)
   */
  static resetIndexedDB() {
    const confirm = window.confirm(
      'IndexedDB를 초기화하시겠습니까?\n\n' +
      '이 작업은 새로운 저장 시스템에 저장된 데이터만 삭제하고,\n' +
      '기존 localStorage 데이터는 유지됩니다.'
    );
    
    if (!confirm) return false;
    
    try {
      const deleteDB = indexedDB.deleteDatabase('EReaderDB');
      deleteDB.onsuccess = () => {
        localStorage.removeItem('ereader-migration-done');
        console.log('✅ IndexedDB 초기화 완료');
        alert('IndexedDB가 초기화되었습니다. 페이지를 새로고침해주세요.');
        window.location.reload();
      };
      
      deleteDB.onerror = () => {
        console.error('❌ IndexedDB 초기화 실패');
        alert('IndexedDB 초기화에 실패했습니다.');
      };
      
      return true;
    } catch (error) {
      console.error('IndexedDB 초기화 실패:', error);
      return false;
    }
  }
  
  /**
   * 시스템 상태 진단
   */
  static async diagnose() {
    const report = [];
    
    // localStorage 확인
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('ereader-') || key.startsWith('reader-')
    );
    report.push(`📦 localStorage 키: ${localStorageKeys.length}개`);
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      report.push(`  - ${key}: ${(size / 1024).toFixed(1)} KB`);
    });
    
    // IndexedDB 확인
    try {
      const databases = await indexedDB.databases();
      const eReaderDB = databases.find(db => db.name === 'EReaderDB');
      report.push(`🗄️ IndexedDB: ${eReaderDB ? '존재함' : '없음'}`);
    } catch (error) {
      report.push(`🗄️ IndexedDB: 확인 불가 (${error.message})`);
    }
    
    // 브라우저 지원 확인
    report.push(`🌐 IndexedDB 지원: ${!!window.indexedDB}`);
    report.push(`💾 Storage API 지원: ${!!navigator.storage}`);
    
    // 마이그레이션 상태
    const migrationDone = localStorage.getItem('ereader-migration-done');
    report.push(`🔄 마이그레이션 상태: ${migrationDone ? '완료' : '미완료'}`);
    
    const reportText = report.join('\n');
    console.log('📊 시스템 진단 결과:\n' + reportText);
    alert('진단 결과:\n\n' + reportText + '\n\n콘솔에서 더 자세한 정보를 확인할 수 있습니다.');
    
    return report;
  }
  
  /**
   * 전역 window 객체에 긴급 복구 함수들 등록
   */
  static registerGlobalFunctions() {
    window.emergencyFix = {
      clearAll: this.clearAllData,
      resetMigration: this.resetMigration,
      resetIndexedDB: this.resetIndexedDB,
      diagnose: this.diagnose,
      help: () => {
        const helpText = `
🚨 E-Reader 긴급 복구 도구

다음 함수들을 브라우저 콘솔에서 실행할 수 있습니다:

• emergencyFix.diagnose()
  - 시스템 상태 진단

• emergencyFix.resetMigration()
  - 마이그레이션 상태 초기화

• emergencyFix.resetIndexedDB()
  - IndexedDB만 초기화 (localStorage 유지)

• emergencyFix.clearAll()
  - 모든 데이터 삭제 (마지막 수단)

• emergencyFix.help()
  - 이 도움말 표시

사용법: 브라우저 개발자 도구(F12) > Console 탭에서 함수명 입력
        `;
        console.log(helpText);
        alert('긴급 복구 도구 사용법이 콘솔에 출력되었습니다.\n\nF12 > Console 탭에서 확인해주세요.');
      }
    };
    
    console.log('🚨 긴급 복구 도구가 등록되었습니다.');
    console.log('사용법: emergencyFix.help()');
  }
}

export default EmergencyFix; 