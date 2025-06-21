import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import EmergencyFix from './utils/EmergencyFix';

// 긴급 복구 도구 등록
EmergencyFix.registerGlobalFunctions();

const root = ReactDOM.createRoot(document.getElementById('root'));

// 개발 환경에서 StrictMode로 인한 중복 실행을 방지하기 위해 조건부 적용
if (process.env.NODE_ENV === 'production') {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} else {
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
} 