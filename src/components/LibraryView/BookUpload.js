import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { FiUpload, FiX, FiFile, FiCheck } from 'react-icons/fi';
import { useBooks } from '../../context/BookContext';

const Overlay = styled.div`
  position: fixed;
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

const Modal = styled.div`
  background: white;
  border-radius: 20px;
  padding: 40px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const Title = styled.h2`
  color: #333;
  font-size: 1.8rem;
  margin: 0 0 30px 0;
  text-align: center;
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.isDragOver ? '#4CAF50' : '#ddd'};
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.isDragOver ? '#f8fff8' : '#fafafa'};
  
  &:hover {
    border-color: #4CAF50;
    background: #f8fff8;
  }
`;

const UploadIcon = styled(FiUpload)`
  font-size: 3rem;
  color: #4CAF50;
  margin-bottom: 20px;
`;

const DropText = styled.p`
  font-size: 1.2rem;
  color: #333;
  margin: 0 0 10px 0;
`;

const DropSubtext = styled.p`
  font-size: 0.9rem;
  color: #666;
  margin: 0;
`;

const FileInput = styled.input`
  display: none;
`;

const FileList = styled.div`
  margin-top: 30px;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 10px;
`;

const FileIcon = styled(FiFile)`
  font-size: 1.5rem;
  color: #4CAF50;
  margin-right: 15px;
`;

const FileInfo = styled.div`
  flex: 1;
`;

const FileName = styled.div`
  font-weight: 500;
  color: #333;
`;

const FileSize = styled.div`
  font-size: 0.8rem;
  color: #666;
`;

const FileStatus = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.success ? '#4CAF50' : '#ff5722'};
  font-size: 0.9rem;
`;

const FileWarning = styled.div`
  font-size: 0.75rem;
  color: #ff9800;
  margin-top: 2px;
  font-style: italic;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #ff5722;
  cursor: pointer;
  padding: 5px;
  margin-left: 10px;
  border-radius: 50%;
  
  &:hover {
    background: #fff3f3;
  }
`;

const UploadButton = styled.button`
  width: 100%;
  padding: 15px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.3s ease;
  
  &:hover {
    background: #45a049;
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const BookUpload = ({ onClose }) => {
  const { addBook } = useBooks();
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return extension === 'epub' || extension === 'pdf';
    });

    const processedFiles = validFiles.map(file => {
      // 파일 크기 경고 (5MB 이상)
      let warningMessage = '';
      if (file.size > 5 * 1024 * 1024) {
        warningMessage = '큰 파일입니다. 저장 공간 문제가 발생할 수 있습니다.';
      }

      return {
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        type: file.name.toLowerCase().split('.').pop(),
        status: 'ready',
        warning: warningMessage
      };
    });

    // 전체 파일 크기 체크
    const totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0);
    const existingSize = files.reduce((sum, file) => sum + file.size, 0);
    
    if (totalSize + existingSize > 10 * 1024 * 1024) { // 10MB 이상
      alert('전체 파일 크기가 너무 큽니다. 저장 공간 부족으로 인해 일부 기능이 제한될 수 있습니다.');
    }

    setFiles(prev => [...prev, ...processedFiles]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = async (fileData) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        
        // 메타데이터 추출 (실제로는 EPUB/PDF 파서 사용)
        const book = {
          title: fileData.name.replace(/\.(epub|pdf)$/i, ''),
          author: '알 수 없음',
          type: fileData.type,
          fileData: arrayBuffer, // ArrayBuffer로 저장 (react-reader 호환)
          content: null, // base64 content 제거
          size: fileData.size,
          coverImage: null // 실제로는 책 표지 추출
        };
        
        resolve(book);
      };
      
      // ArrayBuffer로 읽기 (base64 대신)
      reader.readAsArrayBuffer(fileData.file);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (const fileData of files) {
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'uploading' } : f
        ));
        
        const book = await processFile(fileData);
        addBook(book);
        
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'success' } : f
        ));
      }
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('업로드 오류:', error);
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    } finally {
      setIsUploading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>
        
        <Title>책 추가하기</Title>
        
        <DropZone
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          <DropText>EPUB 또는 PDF 파일을 드래그하세요</DropText>
          <DropSubtext>또는 클릭하여 파일을 선택하세요</DropSubtext>
        </DropZone>
        
        <FileInput
          ref={fileInputRef}
          type="file"
          multiple
          accept=".epub,.pdf"
          onChange={handleFileSelect}
        />
        
        {files.length > 0 && (
          <FileList>
            {files.map(file => (
              <FileItem key={file.id}>
                <FileIcon />
                <FileInfo>
                  <FileName>{file.name}</FileName>
                  <FileSize>{formatFileSize(file.size)}</FileSize>
                  {file.warning && <FileWarning>{file.warning}</FileWarning>}
                </FileInfo>
                <FileStatus success={file.status === 'success'}>
                  {file.status === 'ready' && '대기 중'}
                  {file.status === 'uploading' && '처리 중...'}
                  {file.status === 'success' && (
                    <>
                      <FiCheck style={{ marginRight: '5px' }} />
                      완료
                    </>
                  )}
                  {file.status === 'error' && '오류'}
                </FileStatus>
                {file.status === 'ready' && (
                  <RemoveButton onClick={() => removeFile(file.id)}>
                    <FiX />
                  </RemoveButton>
                )}
              </FileItem>
            ))}
          </FileList>
        )}
        
        {files.length > 0 && (
          <UploadButton
            onClick={handleUpload}
            disabled={isUploading || files.every(f => f.status !== 'ready')}
          >
            {isUploading ? '처리 중...' : `${files.filter(f => f.status === 'ready').length}개 파일 추가`}
          </UploadButton>
        )}
      </Modal>
    </Overlay>
  );
};

export default BookUpload; 