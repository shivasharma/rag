import React from 'react';
import { CheckCircle, AlertCircle, Database, Zap } from 'lucide-react';

function StatusBar({ health }) {
  if (!health) {
    return (
      <div className="status-bar">
        <div className="status-item">
          <div className="status-label">Groq API</div>
          <div className="status-value">Connecting...</div>
        </div>
      </div>
    );
  }

  const isHealthy = health.connected;

  return (
    <div className="status-bar">
      <div className="status-item">
        <div className="status-label">Groq API</div>
        <div className={`status-value ${isHealthy ? 'success' : 'error'}`}>
          {isHealthy ? (
            <>
              <CheckCircle size={18} />
              Running
            </>
          ) : (
            <>
              <AlertCircle size={18} />
              Unreachable
            </>
          )}
        </div>
      </div>

      <div className="status-item">
        <div className="status-label">Groq Model</div>
        <div className="status-value">
          <Zap size={18} className="groq-icon" />
          {health.llmModel}
        </div>
      </div>

      <div className="status-item">
        <div className="status-label">Documents</div>
        <div className="status-value">
          <Database size={18} />
          {health.totalDocuments}
        </div>
      </div>

      <div className="status-item">
        <div className="status-label">Total Chunks</div>
        <div className="status-value">{health.vectorDbSize}</div>
      </div>
    </div>
  );
}

export default StatusBar;

