import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

const HighlightContext = createContext();

export const useHighlights = () => {
  const context = useContext(HighlightContext);
  if (!context) {
    throw new Error('useHighlights must be used within a HighlightProvider');
  }
  return context;
};

const ENCRYPTION_KEY = 'ereader-highlights-key';

export const HighlightProvider = ({ children }) => {
  const [highlights, setHighlights] = useState({});

  // 로컬 스토리지에서 하이라이트 로드 (암호화된 데이터)
  useEffect(() => {
    const savedHighlights = localStorage.getItem('ereader-highlights');
    if (savedHighlights) {
      try {
        const bytes = CryptoJS.AES.decrypt(savedHighlights, ENCRYPTION_KEY);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        setHighlights(JSON.parse(decryptedData));
      } catch (error) {
        console.error('하이라이트 복호화 실패:', error);
      }
    }
  }, []);

  // 하이라이트 변경 시 암호화하여 로컬 스토리지에 저장
  useEffect(() => {
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(highlights), 
      ENCRYPTION_KEY
    ).toString();
    localStorage.setItem('ereader-highlights', encryptedData);
  }, [highlights]);

  const addHighlight = (bookId, highlight) => {
    const newHighlight = {
      id: Date.now().toString(),
      ...highlight,
      createdAt: new Date().toISOString()
    };

    setHighlights(prev => ({
      ...prev,
      [bookId]: [...(prev[bookId] || []), newHighlight]
    }));

    return newHighlight;
  };

  const removeHighlight = (bookId, highlightId) => {
    setHighlights(prev => ({
      ...prev,
      [bookId]: (prev[bookId] || []).filter(h => h.id !== highlightId)
    }));
  };

  const updateHighlight = (bookId, highlightId, updates) => {
    setHighlights(prev => ({
      ...prev,
      [bookId]: (prev[bookId] || []).map(h => 
        h.id === highlightId ? { ...h, ...updates } : h
      )
    }));
  };

  const getHighlights = (bookId) => {
    return highlights[bookId] || [];
  };

  const getHighlightsByPage = (bookId, pageNumber) => {
    return (highlights[bookId] || []).filter(h => h.pageNumber === pageNumber);
  };

  const searchHighlights = (bookId, query) => {
    const bookHighlights = highlights[bookId] || [];
    return bookHighlights.filter(h => 
      h.text.toLowerCase().includes(query.toLowerCase()) ||
      (h.note && h.note.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const value = {
    highlights,
    addHighlight,
    removeHighlight,
    updateHighlight,
    getHighlights,
    getHighlightsByPage,
    searchHighlights
  };

  return (
    <HighlightContext.Provider value={value}>
      {children}
    </HighlightContext.Provider>
  );
}; 