import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import LibraryView from './components/LibraryView/LibraryView';
import ReaderView from './components/ReaderView/ReaderView';
import { BookProvider } from './context/BookContext';
import { HighlightProvider } from './context/HighlightContext';
import { ChatProvider } from './context/ChatContext';
import EmergencyFix from './utils/EmergencyFix';

const AppContainer = styled.div`
  width: 100%;
  height: 100vh;
  overflow: hidden;
`;

function App() {
  // 긴급 복구 도구를 전역에 등록
  useEffect(() => {
    EmergencyFix.registerGlobalFunctions();
  }, []);

  return (
    <BookProvider>
      <HighlightProvider>
        <ChatProvider>
          <AppContainer>
            <Routes>
              <Route path="/" element={<LibraryView />} />
              <Route path="/reader/:bookId" element={<ReaderView />} />
            </Routes>
          </AppContainer>
        </ChatProvider>
      </HighlightProvider>
    </BookProvider>
  );
}

export default App; 