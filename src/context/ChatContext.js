import React, { createContext, useContext, useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

const ENCRYPTION_KEY = 'ereader-chat-key';
const API_KEY_STORAGE = 'ereader-gemini-key';

export const ChatProvider = ({ children }) => {
  const [chatHistory, setChatHistory] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiError, setApiError] = useState('');

  // API 키 로드
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    if (savedKey) {
      try {
        const bytes = CryptoJS.AES.decrypt(savedKey, ENCRYPTION_KEY);
        const decryptedKey = bytes.toString(CryptoJS.enc.Utf8);
        setApiKey(decryptedKey);
      } catch (error) {
        console.error('API 키 복호화 실패:', error);
      }
    }
  }, []);

  // 로컬 스토리지에서 채팅 기록 로드 (암호화된 데이터)
  useEffect(() => {
    const savedChats = localStorage.getItem('ereader-chats');
    if (savedChats) {
      try {
        const bytes = CryptoJS.AES.decrypt(savedChats, ENCRYPTION_KEY);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        setChatHistory(JSON.parse(decryptedData));
      } catch (error) {
        console.error('채팅 기록 복호화 실패:', error);
      }
    }
  }, []);

  // 채팅 기록 변경 시 암호화하여 로컬 스토리지에 저장
  useEffect(() => {
    if (Object.keys(chatHistory).length > 0) {
      const encryptedData = CryptoJS.AES.encrypt(
        JSON.stringify(chatHistory), 
        ENCRYPTION_KEY
      ).toString();
      localStorage.setItem('ereader-chats', encryptedData);
    }
  }, [chatHistory]);

  // activeChat 동기화: chatHistory가 변경될 때 activeChat도 업데이트
  useEffect(() => {
    if (activeChat && chatHistory[activeChat.id]) {
      const updatedChat = chatHistory[activeChat.id];
      if (updatedChat.messages.length !== activeChat.messages.length) {
        console.log('🔄 activeChat 동기화:', {
          기존메시지수: activeChat.messages.length,
          새메시지수: updatedChat.messages.length
        });
        setActiveChat(updatedChat);
      }
    }
  }, [chatHistory, activeChat]);

  // API 키 저장
  const saveApiKey = (key) => {
    const encryptedKey = CryptoJS.AES.encrypt(key, ENCRYPTION_KEY).toString();
    localStorage.setItem(API_KEY_STORAGE, encryptedKey);
    setApiKey(key);
    setApiError('');
  };

  // API 키 삭제
  const removeApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey('');
    setApiError('');
  };

  // Gemini API 호출
  const callGemini = async (selectedText, question) => {
    console.log('🤖 Gemini API 호출 시작:', { selectedText: selectedText.substring(0, 100) + '...', question });
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.');
    }

    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const prompt = `다음은 사용자가 읽고 있는 책의 일부 텍스트입니다:

"${selectedText}"

사용자의 질문: ${question}

위 텍스트와 관련하여 사용자의 질문에 대해 한국어로 자세하고 도움이 되는 답변을 제공해주세요. 텍스트의 내용을 바탕으로 설명하고, 필요한 경우 추가적인 맥락이나 해석을 포함해주세요.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    console.log('📤 API 요청 전송 중...');
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 API 응답 수신:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API 오류:', errorData);
      
      if (response.status === 400 && errorData.error?.message?.includes('API_KEY_INVALID')) {
        throw new Error('잘못된 API 키입니다. 설정에서 올바른 Gemini API 키를 입력해주세요.');
      } else if (response.status === 429) {
        throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
      } else if (response.status === 403) {
        throw new Error('API 키에 대한 권한이 없습니다. API 키 설정을 확인해주세요.');
      } else {
        throw new Error(`API 호출 실패: ${response.status} - ${errorData.error?.message || '알 수 없는 오류'}`);
      }
    }

    const data = await response.json();
    console.log('🔍 API 응답 데이터:', data);
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('❌ 응답에 candidates가 없음:', data);
      throw new Error('AI 응답을 생성할 수 없습니다. 다시 시도해주세요.');
    }

    const response_text = data.candidates[0].content.parts[0].text;
    console.log('✅ AI 응답 텍스트:', response_text.substring(0, 100) + '...');
    
    return response_text;
  };

  // AI API 호출
  const callAI = async (selectedText, question) => {
    setIsLoading(true);
    setApiError('');
    
    try {
      const response = await callGemini(selectedText, question);
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      setApiError(error.message);
      
      // 사용자에게 오류 메시지를 반환
      return `죄송합니다. AI 응답을 생성하는 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n설정에서 API 키를 확인하거나 잠시 후 다시 시도해주세요.`;
    }
  };

  const startChat = (bookId, pageNumber, selectedText) => {
    const chatId = `${bookId}-${pageNumber}-${Date.now()}`;
    const newChat = {
      id: chatId,
      bookId,
      pageNumber,
      selectedText,
      messages: [], // 빈 메시지 배열로 시작
      createdAt: new Date().toISOString()
    };

    setChatHistory(prev => ({
      ...prev,
      [chatId]: newChat
    }));

    setActiveChat(newChat);
    return newChat;
  };

  const sendMessage = async (chatId, message) => {
    console.log('💬 메시지 전송 시작:', { chatId, message });
    
    if (!chatHistory[chatId]) {
      console.error('❌ 채팅을 찾을 수 없음:', chatId);
      return;
    }

    const currentChat = chatHistory[chatId]; // 현재 채팅 정보 저장
    console.log('📋 현재 채팅 정보:', currentChat);

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    console.log('👤 사용자 메시지 추가:', userMessage);

    // 사용자 메시지 추가
    setChatHistory(prev => {
      const updated = {
        ...prev,
        [chatId]: {
          ...prev[chatId],
          messages: [...prev[chatId].messages, userMessage]
        }
      };
      console.log('📝 사용자 메시지 추가 후 상태:', updated[chatId].messages.length);
      return updated;
    });

    try {
      // AI 응답 생성 (저장된 채팅 정보 사용)
      console.log('🤖 AI 응답 요청 시작... selectedText:', currentChat.selectedText.substring(0, 50) + '...');
      const aiResponse = await callAI(currentChat.selectedText, message);
      console.log('🤖 AI 응답 받음:', aiResponse.substring(0, 100) + '...');
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };

      console.log('🤖 AI 메시지 생성:', aiMessage);

      // AI 응답 추가
      setChatHistory(prev => {
        const updated = {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: [...prev[chatId].messages, aiMessage]
          }
        };
        console.log('📝 AI 메시지 추가 후 상태:', updated[chatId].messages.length);
        console.log('📝 최종 메시지들:', updated[chatId].messages.map(m => ({ type: m.type, content: m.content.substring(0, 30) + '...' })));
        return updated;
      });

      console.log('✅ AI 메시지 추가 완료');
      return aiMessage;
    } catch (error) {
      console.error('❌ sendMessage 오류:', error);
      throw error;
    }
  };

  const deleteChat = (chatId) => {
    setChatHistory(prev => {
      const newHistory = { ...prev };
      delete newHistory[chatId];
      return newHistory;
    });

    if (activeChat && activeChat.id === chatId) {
      setActiveChat(null);
    }
  };

  const getChatsByBook = (bookId) => {
    return Object.values(chatHistory).filter(chat => chat.bookId === bookId);
  };

  const getChatsByPage = (bookId, pageNumber) => {
    return Object.values(chatHistory).filter(
      chat => chat.bookId === bookId && chat.pageNumber === pageNumber
    );
  };

  const value = {
    chatHistory,
    activeChat,
    setActiveChat,
    isLoading,
    apiKey,
    apiError,
    saveApiKey,
    removeApiKey,
    startChat,
    sendMessage,
    deleteChat,
    getChatsByBook,
    getChatsByPage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}; 