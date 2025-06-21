import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FiSend, FiX, FiUser, FiMessageCircle, FiTrash2, FiMinimize2, FiSettings } from 'react-icons/fi';
import { useChat } from '../../context/ChatContext';
import AISettings from './AISettings';

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const HeaderButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e9ecef;
  }
`;

const ChatHistory = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
  padding: 40px 20px;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
  opacity: 0.5;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
`;

const ChatList = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ChatItem = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #4CAF50;
  }
  
  ${props => props.active && `
    border-color: #4CAF50;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  `}
`;

const ChatItemHeader = styled.div`
  padding: 12px 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatItemTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ChatItemTime = styled.div`
  font-size: 0.8rem;
  color: #666;
`;

const ChatItemPreview = styled.div`
  padding: 10px 15px;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ActiveChatContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const SelectedTextDisplay = styled.div`
  padding: 15px 20px;
  background: #f0f8ff;
  border-bottom: 1px solid #e0e0e0;
  border-left: 4px solid #4CAF50;
`;

const SelectedTextLabel = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 5px;
  font-weight: 500;
`;

const SelectedText = styled.div`
  font-size: 0.9rem;
  color: #333;
  font-style: italic;
  line-height: 1.4;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Message = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  
  ${props => props.isUser && `
    flex-direction: row-reverse;
  `}
`;

const MessageAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.9rem;
  flex-shrink: 0;
  
  ${props => props.isUser ? `
    background: #4CAF50;
  ` : `
    background: #2196F3;
  `}
`;

const MessageBubble = styled.div`
  max-width: ${props => props.isUser ? '85%' : '95%'};
  padding: 12px 16px;
  border-radius: 18px;
  line-height: 1.5;
  word-wrap: break-word;
  
  ${props => props.isUser ? `
    background: #4CAF50;
    color: white;
    border-bottom-right-radius: 4px;
  ` : `
    background: #f1f3f5;
    color: #333;
    border-bottom-left-radius: 4px;
  `}

  /* 마크다운 스타일링 */
  h1, h2, h3, h4, h5, h6 {
    margin: 12px 0 8px 0;
    color: ${props => props.isUser ? 'white' : '#2c3e50'};
  }

  h1 { font-size: 1.3em; font-weight: bold; }
  h2 { font-size: 1.2em; font-weight: bold; }
  h3 { font-size: 1.1em; font-weight: bold; }

  p {
    margin: 8px 0;
  }

  strong, b {
    font-weight: bold;
    color: ${props => props.isUser ? 'white' : '#2c3e50'};
  }

  em, i {
    font-style: italic;
  }

  code {
    background: ${props => props.isUser ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9em;
  }

  pre {
    background: ${props => props.isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
    
    code {
      background: none;
      padding: 0;
    }
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  blockquote {
    border-left: 3px solid ${props => props.isUser ? 'rgba(255,255,255,0.3)' : '#4CAF50'};
    padding-left: 12px;
    margin: 8px 0;
    font-style: italic;
    opacity: 0.9;
  }
`;

const MessageTime = styled.div`
  font-size: 0.7rem;
  color: #999;
  margin-top: 5px;
  text-align: ${props => props.isUser ? 'right' : 'left'};
`;

const InputContainer = styled.div`
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
`;

const InputArea = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
`;

const MessageInput = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 10px 15px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  font-family: inherit;
  
  &:focus {
    border-color: #4CAF50;
  }
  
  &::placeholder {
    color: #999;
  }
`;

const SendButton = styled.button`
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #4CAF50;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: #45a049;
    transform: scale(1.05);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  font-size: 0.9rem;
  padding: 10px 0;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 3px;
  
  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4CAF50;
    animation: bounce 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0s; }
  }
  
  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
    } 40% {
      transform: scale(1);
    }
  }
`;

// 간단한 마크다운 렌더링 함수
const renderMarkdown = (text) => {
  if (!text) return '';
  
  let html = text
    // 코드 블록 (```)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // 인라인 코드 (`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 볼드 (**)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 이탤릭 (*)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 헤딩
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // 리스트
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
    // 인용구
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // 줄바꿈
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // 리스트 래핑
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  // 단락 래핑
  if (!html.includes('<p>') && !html.includes('<h') && !html.includes('<pre>')) {
    html = '<p>' + html + '</p>';
  }

  return html;
};

const AIChat = ({ book, currentPage, onClose }) => {
  const { 
    activeChat, 
    setActiveChat, 
    chatHistory, 
    sendMessage, 
    deleteChat, 
    getChatsByBook,
    isLoading,
    apiKey
  } = useChat();
  
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (book) {
      const bookChats = getChatsByBook(book.id);
      setChats(bookChats);
    }
  }, [book, chatHistory, getChatsByBook]);

  // activeChat이 업데이트되었는지 확인
  useEffect(() => {
    if (activeChat) {
      // 활성 채팅 변경 로깅은 제거됨
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeChat || isLoading) return;

    const messageText = message.trim();
    setMessage('');
    
    try {
      await sendMessage(activeChat.id, messageText);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChatSelect = (chat) => {
    setActiveChat(chat);
  };

  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    if (window.confirm('이 채팅을 삭제하시겠습니까?')) {
      deleteChat(chatId);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatChatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (showSettings) {
    return <AISettings onClose={() => setShowSettings(false)} />;
  }

  return (
    <Container>
      <Header>
        <Title>
          <FiMessageCircle />
          AI 채팅
          {!apiKey && <span style={{ fontSize: '0.8rem', color: '#f44336', marginLeft: '8px' }}>API 키 필요</span>}
        </Title>
        <HeaderActions>
          <HeaderButton onClick={() => setShowSettings(true)} title="AI 설정">
            <FiSettings size={18} />
          </HeaderButton>
          <HeaderButton onClick={onClose} title="닫기">
            <FiX size={18} />
          </HeaderButton>
        </HeaderActions>
      </Header>

      {!activeChat ? (
        <ChatHistory>
          {chats.length === 0 ? (
            <EmptyState>
              <EmptyStateIcon>💬</EmptyStateIcon>
              <EmptyStateText>
                {!apiKey ? (
                  <>
                    먼저 AI 설정에서 Gemini API 키를 입력해주세요.<br />
                    설정 완료 후 텍스트를 선택하여 AI 채팅을 시작할 수 있습니다.
                  </>
                ) : (
                  <>
                    텍스트를 선택하고 AI 채팅을 시작해보세요.<br />
                    선택한 내용에 대해 질문하거나 설명을 요청할 수 있습니다.
                  </>
                )}
              </EmptyStateText>
            </EmptyState>
          ) : (
            <ChatList>
              {chats.map(chat => (
                <ChatItem
                  key={chat.id}
                  onClick={() => handleChatSelect(chat)}
                >
                  <ChatItemHeader>
                    <ChatItemTitle>
                      페이지 {chat.pageNumber} - AI 채팅
                    </ChatItemTitle>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ChatItemTime>
                        {formatChatTime(chat.createdAt)}
                      </ChatItemTime>
                      <HeaderButton
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        title="삭제"
                      >
                        <FiTrash2 size={14} />
                      </HeaderButton>
                    </div>
                  </ChatItemHeader>
                  <ChatItemPreview>
                    "{chat.selectedText}"
                  </ChatItemPreview>
                </ChatItem>
              ))}
            </ChatList>
          )}
        </ChatHistory>
      ) : (
        <ActiveChatContainer>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px' }}>
            <HeaderButton 
              onClick={() => setActiveChat(null)}
              title="채팅 목록으로 돌아가기"
            >
              <FiMinimize2 size={16} />
            </HeaderButton>
            <span style={{ marginLeft: '10px', fontSize: '0.9rem', color: '#666' }}>
              페이지 {activeChat.pageNumber}
            </span>
          </div>

          <SelectedTextDisplay>
            <SelectedTextLabel>선택된 텍스트:</SelectedTextLabel>
            <SelectedText>"{activeChat.selectedText}"</SelectedText>
          </SelectedTextDisplay>

          <MessagesContainer>
            {activeChat.messages.length === 0 && !isLoading && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#666',
                textAlign: 'center',
                padding: '40px 20px'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🤖</div>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  위에 표시된 텍스트에 대해<br />
                  무엇이든 질문해보세요!
                </p>
              </div>
            )}
            
            {activeChat.messages.map(msg => (
              <Message key={msg.id} isUser={msg.type === 'user'}>
                <MessageAvatar isUser={msg.type === 'user'}>
                  {msg.type === 'user' ? <FiUser /> : '🤖'}
                </MessageAvatar>
                <div>
                  <MessageBubble 
                    isUser={msg.type === 'user'}
                    dangerouslySetInnerHTML={{
                      __html: msg.type === 'ai' ? renderMarkdown(msg.content) : msg.content
                    }}
                  />
                  <MessageTime isUser={msg.type === 'user'}>
                    {formatTime(msg.timestamp)}
                  </MessageTime>
                </div>
              </Message>
            ))}
            
            {isLoading && (
              <Message isUser={false}>
                <MessageAvatar isUser={false}>🤖</MessageAvatar>
                <div>
                  <MessageBubble isUser={false}>
                    <LoadingIndicator>
                      AI가 답변을 준비 중입니다
                      <LoadingDots>
                        <span></span>
                        <span></span>
                        <span></span>
                      </LoadingDots>
                    </LoadingIndicator>
                  </MessageBubble>
                </div>
              </Message>
            )}
            
            <div ref={messagesEndRef} />
          </MessagesContainer>

          <InputContainer>
            <InputArea>
              <MessageInput
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="AI에게 질문하세요..."
                disabled={isLoading}
              />
              <SendButton
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                title="메시지 전송"
              >
                <FiSend size={18} />
              </SendButton>
            </InputArea>
          </InputContainer>
        </ActiveChatContainer>
      )}
    </Container>
  );
};

export default AIChat; 