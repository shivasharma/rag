import { writeFileSync } from 'fs';

const content = `# RAG System - Document Q&A

A full-stack Retrieval-Augmented Generation (RAG) application that lets you upload documents and ask questions about their content. Powered by [Groq API](https://console.groq.com) for fast, cloud-based LLM inference.

**Live demo:** http://66.179.137.126/project

---

## Features

- Upload PDF and Word (DOCX) documents
- Automatic text chunking and vector indexing
- Semantic search to find relevant context
- AI-generated answers via Groq API
- Rate limiting and security headers out of the box
- Auto-deployment via GitHub Actions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express 5 |
| LLM | Groq API (llama-3.3-70b-versatile) |
| Document parsing | pdf-parse, mammoth |
| Process manager | PM2 |
| Web server | Nginx |

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com)

### Setup

\`\`\`bash
# Clone the repo
git clone https://github.com/shivasharma/rag.git
cd rag

# Install all dependencies
npm run install:all

# Create the server environment file
cp server/.env.example server/.env
# Edit server/.env and add your GROQ_API_KEY
\`\`\`

### Run

\`\`\`bash
# Start the backend (port 5000)
npm run dev:server

# Start the frontend (port 3000)
npm run dev:client
\`\`\`

Open http://localhost:3000

---

## Environment Variables

Create \`server/.env\` based on \`server/.env.example\`:

| Variable | Description |
|---|---|
| \`GROQ_API_KEY\` | Your Groq API key |
| \`GROQ_MODEL\` | Model to use (e.g. \`llama-3.3-70b-versatile\`) |
| \`PORT\` | Express server port (default: \`5000\`) |
| \`NODE_ENV\` | Set to \`production\` on the server |

---

## Project Structure

\`\`\`
rag-nodejs/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # DocumentUpload, QueryInterface, StatusBar
│   │   └── App.jsx
│   └── vite.config.js
├── server/                 # Express backend
│   ├── rag/
│   │   ├── ragCore.js            # Core RAG logic
│   │   ├── embeddings.js         # Embedding generation
│   │   ├── documentProcessor.js  # PDF/DOCX parsing
│   │   └── vectorDatabase.js     # Vector storage
│   └── server.js
└── .github/workflows/
    └── deploy.yml          # CI/CD pipeline
\`\`\`

---

## Production Deployment

### Build

\`\`\`bash
npm run build
\`\`\`

Outputs to \`client/dist/\`.

### Nginx config

\`\`\`nginx
location /project {
    alias /var/www/rag-nodejs/client/dist;
    try_files $uri $uri/ /project/index.html;
}

location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
\`\`\`

### Start server

\`\`\`bash
cd server
pm2 start server.js --name rag-api
pm2 save
\`\`\`

---

## CI/CD

Pushing to \`main\` automatically deploys to the VPS via GitHub Actions.

**Required GitHub secrets:**

| Secret | Value |
|---|---|
| \`VPS_HOST\` | VPS IP address |
| \`VPS_USER\` | SSH username |
| \`VPS_SSH_KEY\` | Private SSH key |

The workflow pulls the latest code, rebuilds the frontend, and restarts PM2.

---

## License

MIT
`;

writeFileSync('README.md', content);
console.log('README.md written successfully');
