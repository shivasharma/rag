import React, { useState } from 'react';
import { Send, Loader } from 'lucide-react';

function QueryInterface({ isDisabled, apiBase }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);

  async function handleAsk() {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch(`${apiBase}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      const result = await response.json();
      setAnswer(result);
      setQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isDisabled && !loading && question.trim()) {
      handleAsk();
    }
  };

  return (
    <div className="query-section">
      <div className="query-input-group">
        <input
          type="text"
          placeholder={isDisabled ? 'Upload a document first...' : 'Ask a question about your documents...'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled || loading}
          className="query-input"
        />
        <button
          onClick={handleAsk}
          disabled={isDisabled || loading || !question.trim()}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <Loader size={18} className="spinner" />
              Thinking...
            </>
          ) : (
            <>
              <Send size={18} />
              Ask
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="message message-error">
          {error}
        </div>
      )}

      {answer && (
        <div className="answer-box">
          <div className="answer-section">
            <h3>Answer</h3>
            <p className="answer-text">{answer.answer}</p>
          </div>

          {answer.sources && answer.sources.length > 0 && (
            <div className="sources-section">
              <h3>Sources ({answer.sourcesCount})</h3>
              <div className="sources-list">
                {answer.sources.map((source, index) => (
                  <div key={index} className="source-item">
                    <span className="source-number">{index + 1}</span>
                    <div className="source-content">
                      <div className="source-meta">
                        <span className="source-filename">{source.source}</span>
                        {source.similarity != null && (
                          <span className="source-similarity">
                            {Math.round(source.similarity * 100)}% match
                          </span>
                        )}
                      </div>
                      <p className="source-text">
                        {source.text.length > 200 ? source.text.substring(0, 200) + '...' : source.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QueryInterface;
