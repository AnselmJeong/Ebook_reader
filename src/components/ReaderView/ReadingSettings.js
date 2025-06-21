import React from 'react';
import styled from 'styled-components';
import { FiX, FiSun, FiMoon, FiType, FiZoomIn, FiZoomOut, FiColumns, FiFile } from 'react-icons/fi';

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Panel = styled.div`
  background: white;
  border-radius: 16px;
  padding: 30px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
`;

const Title = styled.h3`
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 8px;
  border-radius: 8px;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const SettingGroup = styled.div`
  margin-bottom: 25px;
`;

const SettingLabel = styled.label`
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const SliderButton = styled.button`
  background: #f5f5f5;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
  
  &:hover {
    background: #e9ecef;
    color: #333;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: #4CAF50;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: #4CAF50;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const SliderValue = styled.span`
  min-width: 40px;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const OptionButton = styled.button`
  padding: 10px 16px;
  border: 2px solid ${props => props.active ? '#4CAF50' : '#e0e0e0'};
  background: ${props => props.active ? '#4CAF50' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    border-color: #4CAF50;
    ${props => !props.active && `
      background: #f8fff8;
      color: #4CAF50;
    `}
  }
`;

const ThemeButton = styled(OptionButton)`
  flex: 1;
  justify-content: center;
`;

const FontFamilyButton = styled(OptionButton)`
  font-family: ${props => props.fontFamily};
`;

const PreviewText = styled.div`
  margin-top: 20px;
  padding: 20px;
  background: ${props => {
    switch(props.theme) {
      case 'dark': return '#1a1a1a';
      case 'sepia': return '#f4f1ea';
      default: return '#ffffff';
    }
  }};
  color: ${props => {
    switch(props.theme) {
      case 'dark': return '#e0e0e0';
      case 'sepia': return '#5c4b37';
      default: return '#333333';
    }
  }};
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  font-size: ${props => props.fontSize}px;
  line-height: ${props => props.lineHeight};
  font-family: ${props => props.fontFamily === 'serif' ? 'Georgia, serif' : 
                     props.fontFamily === 'sans-serif' ? '-apple-system, BlinkMacSystemFont, sans-serif' :
                     '"Courier New", monospace'};
`;

const ReadingSettings = ({ settings, onSettingsChange, onClose }) => {
  const handleFontSizeChange = (delta) => {
    const newSize = Math.max(12, Math.min(24, settings.fontSize + delta));
    onSettingsChange({ fontSize: newSize });
  };

  const handleZoomChange = (delta) => {
    const newZoom = Math.max(50, Math.min(200, settings.zoom + delta));
    onSettingsChange({ zoom: newZoom });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Panel>
        <Header>
          <Title>읽기 설정</Title>
          <CloseButton onClick={onClose}>
            <FiX size={20} />
          </CloseButton>
        </Header>

        <SettingGroup>
          <SettingLabel>글자 크기</SettingLabel>
          <SliderContainer>
            <SliderButton 
              onClick={() => handleFontSizeChange(-1)}
              disabled={settings.fontSize <= 12}
            >
              <FiType size={14} />
            </SliderButton>
            <Slider
              type="range"
              min="12"
              max="24"
              value={settings.fontSize}
              onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value) })}
            />
            <SliderValue>{settings.fontSize}px</SliderValue>
            <SliderButton 
              onClick={() => handleFontSizeChange(1)}
              disabled={settings.fontSize >= 24}
            >
              <FiType size={18} />
            </SliderButton>
          </SliderContainer>
        </SettingGroup>

        <SettingGroup>
          <SettingLabel>줄 간격</SettingLabel>
          <SliderContainer>
            <Slider
              type="range"
              min="1.2"
              max="2.0"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => onSettingsChange({ lineHeight: parseFloat(e.target.value) })}
            />
            <SliderValue>{settings.lineHeight}</SliderValue>
          </SliderContainer>
        </SettingGroup>

        <SettingGroup>
          <SettingLabel>확대/축소 (PDF용)</SettingLabel>
          <SliderContainer>
            <SliderButton 
              onClick={() => handleZoomChange(-10)}
              disabled={settings.zoom <= 50}
            >
              <FiZoomOut size={16} />
            </SliderButton>
            <Slider
              type="range"
              min="50"
              max="200"
              step="10"
              value={settings.zoom}
              onChange={(e) => onSettingsChange({ zoom: parseInt(e.target.value) })}
            />
            <SliderValue>{settings.zoom}%</SliderValue>
            <SliderButton 
              onClick={() => handleZoomChange(10)}
              disabled={settings.zoom >= 200}
            >
              <FiZoomIn size={16} />
            </SliderButton>
          </SliderContainer>
        </SettingGroup>

        <SettingGroup>
          <SettingLabel>글꼴</SettingLabel>
          <ButtonGroup>
            <FontFamilyButton
              active={settings.fontFamily === 'serif'}
              fontFamily="Georgia, serif"
              onClick={() => onSettingsChange({ fontFamily: 'serif' })}
            >
              Serif
            </FontFamilyButton>
            <FontFamilyButton
              active={settings.fontFamily === 'sans-serif'}
              fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
              onClick={() => onSettingsChange({ fontFamily: 'sans-serif' })}
            >
              Sans-serif
            </FontFamilyButton>
            <FontFamilyButton
              active={settings.fontFamily === 'monospace'}
              fontFamily='"Courier New", monospace'
              onClick={() => onSettingsChange({ fontFamily: 'monospace' })}
            >
              Monospace
            </FontFamilyButton>
          </ButtonGroup>
        </SettingGroup>

        <SettingGroup>
          <SettingLabel>페이지 레이아웃 (EPUB용)</SettingLabel>
          <ButtonGroup>
            <ThemeButton
              active={settings.pageLayout === 'single'}
              onClick={() => onSettingsChange({ pageLayout: 'single' })}
            >
              <FiFile size={16} />
              한 페이지
            </ThemeButton>
            <ThemeButton
              active={settings.pageLayout === 'double'}
              onClick={() => onSettingsChange({ pageLayout: 'double' })}
            >
              <FiColumns size={16} />
              두 페이지
            </ThemeButton>
          </ButtonGroup>
        </SettingGroup>

        <SettingGroup>
          <SettingLabel>테마</SettingLabel>
          <ButtonGroup>
            <ThemeButton
              active={settings.theme === 'light'}
              onClick={() => onSettingsChange({ theme: 'light' })}
            >
              <FiSun size={16} />
              밝게
            </ThemeButton>
            <ThemeButton
              active={settings.theme === 'sepia'}
              onClick={() => onSettingsChange({ theme: 'sepia' })}
            >
              <FiType size={16} />
              세피아
            </ThemeButton>
            <ThemeButton
              active={settings.theme === 'dark'}
              onClick={() => onSettingsChange({ theme: 'dark' })}
            >
              <FiMoon size={16} />
              어둡게
            </ThemeButton>
          </ButtonGroup>
        </SettingGroup>

        <PreviewText
          fontSize={settings.fontSize}
          lineHeight={settings.lineHeight}
          fontFamily={settings.fontFamily}
          theme={settings.theme}
        >
          샘플 텍스트입니다. 이 설정으로 책을 읽을 때의 모습을 미리 볼 수 있습니다. 
          글자 크기, 줄 간격, 글꼴, 테마를 조정하여 최적의 읽기 환경을 만들어보세요.
        </PreviewText>
      </Panel>
    </Overlay>
  );
};

export default ReadingSettings; 