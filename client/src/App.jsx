import React, { useState, useEffect } from 'react';
import DocumentUpload from './components/DocumentUpload';
import QueryInterface from './components/QueryInterface';
import StatusBar from './components/StatusBar';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL;

function App() {
  const [status, setStatus] = useState('checking');
  const [health, setHealth] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      setHealth(data.system);
      setStatus(data.system.connected ? 'ready' : 'error');
    } catch (error) {
      setStatus('error');
      setHealth(null);
    }
  }

  async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setMessage({ type: 'loading', text: `Uploading ${file.name}...` });

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();

      setUploadedFiles(prev => [...prev, { name: result.filename, chunks: result.chunks }]);
      setMessage({ type: 'success', text: `${result.filename} uploaded — ${result.chunks} chunks created.` });

      checkHealth();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
    }
  }

  async function handleClear() {
    if (!window.confirm('Delete all documents from the vector database auto deploy?')) return;

    try {
      const response = await fetch(`${API_BASE}/clear`, { method: 'POST' });
      if (!response.ok) throw new Error('Clear request failed');

      setUploadedFiles([]);
      setMessage({ type: 'success', text: 'All documents cleared.' });
      checkHealth();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    }
  }

  const canQuery = status === 'ready' && uploadedFiles.length > 0;

  return (
    <div className="app">
      <div className="header">
        <h1>RAG System</h1>
        <p>Document Q&A powered by <strong>Groq API</strong> — fast, cloud-based LLM inference</p>
      </div>

      <div className="container">
        <StatusBar health={health} />

        {message && (
          <div className={`message message-${message.type}`}>
            {message.text}
          </div>
        )}

        {status !== 'ready' && (
          <div className="info-box info-box-warning">
            Cannot reach the Groq API. Check that <code>GROQ_API_KEY</code> is set correctly in your server <code>.env</code> file.
          </div>
        )}

        <div className="info-box">
          <strong>How it works:Automation</strong> Upload PDF, Word, Text, or Markdown files. The system
          chunks your documents and uses keyword-based vector search to find relevant context,
          then sends it to the <strong>Groq API</strong> (<code>{health?.llmModel || 'llama3-8b-8192'}</code>) to generate an answer.
        </div>

        <div className="section">
          <h2>Upload Documents</h2>
          <DocumentUpload
            onUpload={handleFileUpload}
            isDisabled={status !== 'ready'}
            uploadedFiles={uploadedFiles}
          />
        </div>

        <div className="section">
          <h2>Ask a Question</h2>
          {!canQuery && status === 'ready' && (
            <p className="hint-text">Upload at least one document to enable questions.</p>
          )}
          <QueryInterface
            isDisabled={!canQuery}
            apiBase={API_BASE}
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="section section-management">
            <button className="btn btn-danger" onClick={handleClear}>
              Clear All Documents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
