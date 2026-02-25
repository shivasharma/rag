import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { RagSystem } from './rag/ragCore.js';
import { DocumentProcessor } from './rag/documentProcessor.js';

const isProd = process.env.NODE_ENV === 'production';

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = isProd
  ? ['https://shivaprogramming.com']
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General: 200 requests per 15 min per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
}));

// Query: 30 requests per 15 min — each query hits the Groq API
app.use('/api/query', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Query rate limit reached. Please wait before asking again.' }
}));

// Upload: 20 uploads per 15 min
app.use('/api/upload', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit reached. Please wait before uploading again.' }
}));

// ── Body + file upload ────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB max
});

// ── Runtime folders ───────────────────────────────────────────────────────────
if (!fs.existsSync('uploads'))   fs.mkdirSync('uploads');
if (!fs.existsSync('vector-db')) fs.mkdirSync('vector-db');

const ragSystem = new RagSystem();

// ============================================================================
// API ROUTES
// ============================================================================

app.get('/api/health', async (req, res) => {
  try {
    const health = await ragSystem.getSystemHealth();
    res.json({ status: 'healthy', system: health, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check error:', error);
    res.json({
      status: 'error',
      system: {
        connected: false,
        llmModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        totalDocuments: 0,
        vectorDbSize: 0
      },
      error: isProd ? 'Health check failed' : error.message
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log(`\n📄 Processing: ${req.file.originalname}`);

    const text = await DocumentProcessor.processFile(req.file.path, req.file.originalname);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Document appears to be empty' });
    }

    const chunks = ragSystem.chunkText(text, { chunkSize: 500, overlap: 50 });
    console.log(`  → Created ${chunks.length} chunks`);

    await ragSystem.addDocument(req.file.originalname, chunks);
    console.log('  → Document processed successfully\n');

    fs.unlinkSync(req.file.path);

    const stats = ragSystem.getStats();
    res.json({
      success: true,
      filename: req.file.originalname,
      chunks: chunks.length,
      totalDocs: stats.totalDocuments,
      message: `Successfully processed ${req.file.originalname}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: isProd ? 'Upload failed' : error.message });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }

    if (question.length > 1000) {
      return res.status(400).json({ error: 'Question is too long (max 1000 characters)' });
    }

    const stats = ragSystem.getStats();
    if (stats.totalDocuments === 0) {
      return res.status(400).json({ error: 'No documents uploaded. Please upload a document first.' });
    }

    console.log(`\n❓ Question: ${question}`);
    const result = await ragSystem.answerQuestion(question);
    console.log(`  → Used ${result.sources.length} source chunks\n`);

    res.json({
      success: true,
      question,
      answer: result.answer,
      sources: result.sources,
      sourcesCount: result.sources.length
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: isProd ? 'Query failed' : error.message });
  }
});

app.get('/api/stats', (req, res) => {
  res.json(ragSystem.getStats());
});

app.post('/api/clear', (req, res) => {
  try {
    ragSystem.clearDatabase();

    const uploadsDir = 'uploads';
    if (fs.existsSync(uploadsDir)) {
      fs.readdirSync(uploadsDir).forEach(file => {
        fs.unlinkSync(path.join(uploadsDir, file));
      });
    }

    res.json({ success: true, message: 'Database cleared' });
  } catch (error) {
    res.status(500).json({ error: isProd ? 'Clear failed' : error.message });
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : err.message
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ============================================================================
// START
// ============================================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════════╗
║     RAG System - Node.js + React           ║
║                                            ║
║  Server running on port ${PORT}               ║
║  Mode: ${isProd ? 'production              ' : 'development             '}║
╚════════════════════════════════════════════╝
  `);

  try {
    const health = await ragSystem.getSystemHealth();
    console.log(`   Groq API: ${health.connected ? '✅ Connected' : '❌ Unreachable'}`);
    console.log(`   Model:    ${health.llmModel}`);
    console.log(`   Documents: ${health.totalDocuments}`);
  } catch {
    console.log('   Could not reach Groq API — check GROQ_API_KEY in .env');
  }
});

export default app;
