import React, { useState } from 'react';
import styled from 'styled-components';
import { FiSettings, FiEye, FiEyeOff, FiSave, FiTrash2, FiExternalLink, FiX } from 'react-icons/fi';
import { useChat } from '../../context/ChatContext';

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

const CloseButton = styled.button`
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

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Content = styled.div`
  flex: 1;
  padding: 30px;
  overflow-y: auto;
`;

const Section = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 15px 0;
`;

const SectionDescription = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  
  &:focus {
    border-color: #4CAF50;
  }
  
  &::placeholder {
    color: #999;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #333;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  
  ${props => props.primary ? `
    background: #4CAF50;
    color: white;
    
    &:hover {
      background: #45a049;
    }
    
    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  ` : `
    background: #f8f9fa;
    color: #666;
    border: 1px solid #e0e0e0;
    
    &:hover {
      background: #e9ecef;
    }
  `}
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-top: 10px;
  
  ${props => props.type === 'success' ? `
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  ` : props.type === 'error' ? `
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  ` : `
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  `}
`;

const InfoBox = styled.div`
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
`;

const InfoTitle = styled.div`
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoContent = styled.div`
  font-size: 0.9rem;
  color: #1976d2;
  line-height: 1.5;
`;

const Link = styled.a`
  color: #4CAF50;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const AISettings = ({ onClose }) => {
  const { apiKey, apiError, saveApiKey, removeApiKey } = useChat();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveKey = async () => {
    if (!inputKey.trim()) return;
    
    setIsLoading(true);
    try {
      // 간단한 API 키 형식 검증
      if (!inputKey.trim().startsWith('AIzaSy')) {
        throw new Error('유효하지 않은 Gemini API 키 형식입니다.');
      }
      
      saveApiKey(inputKey.trim());
      setInputKey('');
      
      // 저장 성공 표시
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } catch (error) {
      setIsLoading(false);
      console.error('API 키 저장 실패:', error);
    }
  };

  const handleRemoveKey = () => {
    if (window.confirm('저장된 API 키를 삭제하시겠습니까?')) {
      removeApiKey();
    }
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    return key.substring(0, 10) + '*'.repeat(key.length - 14) + key.substring(key.length - 4);
  };

  return (
    <Container>
      <Header>
        <Title>
          <FiSettings />
          AI 설정
        </Title>
        <CloseButton onClick={onClose} title="닫기">
          <FiX size={18} />
        </CloseButton>
      </Header>

      <Content>
        <Section>
          <SectionTitle>Gemini API 설정</SectionTitle>
          <SectionDescription>
            Google Gemini 2.0 Flash Experimental 모델을 사용하여 AI 채팅을 이용할 수 있습니다.
            API 키는 암호화되어 안전하게 저장됩니다.
          </SectionDescription>

          <FormGroup>
            <Label>현재 상태</Label>
            {apiKey ? (
              <StatusIndicator type="success">
                ✅ API 키가 설정되었습니다: {maskApiKey(apiKey)}
              </StatusIndicator>
            ) : (
              <StatusIndicator type="warning">
                ⚠️ API 키가 설정되지 않았습니다
              </StatusIndicator>
            )}
            
            {apiError && (
              <StatusIndicator type="error">
                ❌ {apiError}
              </StatusIndicator>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Gemini API 키</Label>
            <InputContainer>
              <Input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy로 시작하는 Gemini API 키를 입력하세요"
              />
              <ToggleButton
                type="button"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <FiEyeOff /> : <FiEye />}
              </ToggleButton>
            </InputContainer>
            
            <ButtonGroup>
              <Button
                primary
                onClick={handleSaveKey}
                disabled={!inputKey.trim() || isLoading}
              >
                <FiSave />
                {isLoading ? '저장 중...' : 'API 키 저장'}
              </Button>
              
              {apiKey && (
                <Button onClick={handleRemoveKey}>
                  <FiTrash2 />
                  API 키 삭제
                </Button>
              )}
            </ButtonGroup>
          </FormGroup>

          <InfoBox>
            <InfoTitle>
              🔑 API 키 발급 방법
            </InfoTitle>
            <InfoContent>
              1. <Link href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio <FiExternalLink size={12} />
              </Link>에 접속하세요<br />
              2. Google 계정으로 로그인하세요<br />
              3. "Create API Key" 버튼을 클릭하세요<br />
              4. 생성된 API 키를 복사하여 위 필드에 입력하세요<br />
              5. API 키는 "AIzaSy"로 시작합니다
            </InfoContent>
          </InfoBox>
        </Section>

        <Section>
          <SectionTitle>모델 정보</SectionTitle>
          <SectionDescription>
            <strong>사용 모델:</strong> Google Gemini 2.0 Flash Experimental<br />
            <strong>특징:</strong> 빠른 응답 속도, 높은 정확도, 한국어 지원<br />
            <strong>용도:</strong> 텍스트 분석, 질문 답변, 내용 설명
          </SectionDescription>
        </Section>
      </Content>
    </Container>
  );
};

export default AISettings; 