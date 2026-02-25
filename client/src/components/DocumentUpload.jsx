import React, { useRef, useState } from 'react';
import { Upload, File, CheckCircle } from 'lucide-react';

function DocumentUpload({ onUpload, isDisabled, uploadedFiles }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const VALID_EXTENSIONS = ['.txt', '.pdf', '.docx', '.md'];

  const isValidFile = (file) =>
    VALID_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

  const handleClick = () => {
    if (!isDisabled) fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidFile(file)) {
      alert('Please upload a PDF, Word (.docx), Text (.txt), or Markdown (.md) file.');
      return;
    }

    onUpload(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDisabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!isValidFile(file)) {
      alert('Please upload a PDF, Word (.docx), Text (.txt), or Markdown (.md) file.');
      return;
    }

    onUpload(file);
  };

  const areaClass = [
    'upload-area',
    isDisabled ? 'upload-area-disabled' : '',
    isDragging ? 'upload-area-dragging' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className="upload-section">
      <div
        className={areaClass}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload size={40} className="upload-icon" />
        <div className="upload-text">
          {isDragging ? 'Drop file here' : 'Click or drag a file here'}
        </div>
        <div className="upload-subtext">PDF, Word (.docx), Text (.txt), Markdown (.md)</div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          disabled={isDisabled}
          style={{ display: 'none' }}
          accept=".pdf,.docx,.txt,.md"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="file-list">
          <div className="file-list-title">Uploaded Files ({uploadedFiles.length})</div>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="file-item">
              <div className="file-info">
                <File size={18} className="file-icon" />
                <span className="file-name">{file.name}</span>
              </div>
              <span className="file-chunks">{file.chunks} chunks</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
