import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  background: #fafafa;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const LoadingText = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 8px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const LoadingSubtext = styled.div`
  font-size: 0.9rem;
  color: #999;
  text-align: center;
  max-width: 300px;
  line-height: 1.4;
`;

const ProgressDots = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 16px;
  
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4CAF50;
    animation: ${pulse} 1.5s ease-in-out infinite;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const LoadingSpinner = ({ 
  message = "책을 로드하는 중...", 
  subtext = "잠시만 기다려주세요"
}) => {
  const [loadingTime, setLoadingTime] = React.useState(0);
  
  React.useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // 10초 이상 로딩 시 추가 메시지 표시
  const getTimeBasedMessage = () => {
    if (loadingTime > 10) {
      return "초기 설정이 진행 중입니다... 조금 더 기다려주세요";
    } else if (loadingTime > 5) {
      return "데이터를 준비하고 있습니다...";
    }
    return subtext;
  };

  return (
    <LoadingContainer>
      <Spinner />
      <LoadingText>{message}</LoadingText>
      <LoadingSubtext>{getTimeBasedMessage()}</LoadingSubtext>
      <ProgressDots>
        <span />
        <span />
        <span />
      </ProgressDots>
      {loadingTime > 15 && (
        <LoadingSubtext style={{ marginTop: '20px', color: '#f44336' }}>
          로딩이 너무 오래 걸린다면 페이지를 새로고침해보세요
        </LoadingSubtext>
      )}
    </LoadingContainer>
  );
};

export default LoadingSpinner; 