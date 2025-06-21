import React from 'react';
import styled from 'styled-components';
import { FiHardDrive, FiInfo } from 'react-icons/fi';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 15px;
  margin: 10px 0;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const UsageText = styled.div`
  font-size: 0.8rem;
  opacity: 0.9;
  margin-bottom: 8px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.percentage > 80) return '#ff5722';
    if (props.percentage > 60) return '#ff9800';
    return '#4CAF50';
  }};
  width: ${props => Math.min(props.percentage, 100)}%;
  transition: all 0.3s ease;
`;

const InfoButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const StorageIndicator = ({ storageUsage, onInfoClick }) => {
  const { used, available, percentage } = storageUsage;
  
  if (available === 0) return null;

  const formatSize = (mb) => {
    if (mb < 1024) return `${mb}MB`;
    return `${(mb / 1024).toFixed(1)}GB`;
  };

  const getStatusText = () => {
    if (percentage > 80) return '저장 공간이 부족합니다';
    if (percentage > 60) return '저장 공간 주의';
    return '저장 공간 양호';
  };

  const showStorageInfo = () => {
    const info = `
📊 저장 공간 정보

🔸 사용 중: ${formatSize(used)}
🔸 전체 용량: ${formatSize(available)}
🔸 사용률: ${percentage}%

💡 팁:
• IndexedDB는 localStorage보다 훨씬 큰 용량을 지원합니다
• 일반적으로 디스크 용량의 50% 정도까지 사용 가능
• 큰 ebook 파일도 문제없이 저장할 수 있습니다
• 30일 이상 열지 않은 책은 자동으로 정리됩니다
    `;
    
    alert(info);
  };

  return (
    <Container>
      <IconContainer>
        <FiHardDrive size={18} />
      </IconContainer>
      
      <Content>
        <Title>{getStatusText()}</Title>
        <UsageText>
          {formatSize(used)} / {formatSize(available)} 사용 중
        </UsageText>
        <ProgressBar>
          <ProgressFill percentage={percentage} />
        </ProgressBar>
      </Content>
      
      <InfoButton onClick={showStorageInfo} title="저장 공간 정보">
        <FiInfo size={14} />
      </InfoButton>
    </Container>
  );
};

export default StorageIndicator; 