import axios from 'axios';
import { VectorDatabase } from './vectorDatabase.js';
import { EmbeddingGenerator } from './embeddings.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class RagSystem {
  constructor() {
    // Read env vars here — after dotenv.config() has already run in server.js
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqModel  = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    this.vectorDB   = new VectorDatabase();
    this.embeddings = new EmbeddingGenerator();
    this.documents  = new Map();
  }

  chunkText(text, options = {}) {
    const chunkSize = options.chunkSize || 500;
    const overlap   = options.overlap   || 50;

    if (!text || text.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
      const chunk = text.slice(i, i + chunkSize).trim();
      if (chunk.length > 10) chunks.push(chunk);
      if (i + chunkSize >= text.length) break;
    }
    return chunks;
  }

  async addDocument(filename, chunks) {
    const embeddings = await this.embeddings.getEmbeddingsBatch(chunks);

    for (let i = 0; i < chunks.length; i++) {
      this.vectorDB.addVector({
        id:        `${filename}_${i}`,
        embedding: embeddings[i],
        text:      chunks[i],
        source:    filename,
        chunkId:   i
      });
    }

    this.documents.set(filename, { chunks: chunks.length, addedAt: new Date() });
  }

  async retrieveContext(query, k = 3) {
    try {
      const queryEmbedding = await this.embeddings.getEmbedding(query);
      const results = this.vectorDB.search(queryEmbedding, k);
      return results.map(r => ({ text: r.text, source: r.source, similarity: r.similarity }));
    } catch (error) {
      console.error('Retrieval error:', error);
      return [];
    }
  }

  buildPrompt(query, contextChunks) {
    if (contextChunks.length === 0) {
      return `Answer the following question:\n\nQuestion: ${query}\n\nIf you don't know the answer, say so.`;
    }

    const context = contextChunks.map(c => c.text).join('\n---\n');

    return `Use the following context from uploaded documents to answer the question.
Only use information from the context. If the answer is not in the context, say so.

CONTEXT:
${context}

QUESTION: ${query}`;
  }

  async generateAnswer(prompt) {
    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY is not set in .env');
    }

    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model:       this.groqModel,
          messages:    [{ role: 'user', content: prompt }],
          max_tokens:  600,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type':  'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices?.[0]?.message?.content?.trim()
        || 'No response generated';
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      throw new Error(`Groq API error: ${msg}`);
    }
  }

  async answerQuestion(query) {
    const sources = await this.retrieveContext(query);
    const prompt  = this.buildPrompt(query, sources);
    const answer  = await this.generateAnswer(prompt);
    return { query, answer, sources };
  }

  async getSystemHealth() {
    let connected = false;

    if (this.groqApiKey) {
      try {
        const response = await axios.get(
          'https://api.groq.com/openai/v1/models',
          {
            headers: { 'Authorization': `Bearer ${this.groqApiKey}` },
            timeout: 5000
          }
        );
        connected = response.status === 200;
      } catch {
        connected = false;
      }
    }

    return {
      connected,
      llmModel:       this.groqModel,
      totalDocuments: this.documents.size,
      vectorDbSize:   this.vectorDB.getSize()
    };
  }

  getStats() {
    return {
      totalDocuments: this.documents.size,
      vectorDbSize:   this.vectorDB.getSize(),
      documents: Array.from(this.documents.entries()).map(([name, data]) => ({
        name,
        chunks:  data.chunks,
        addedAt: data.addedAt
      }))
    };
  }

  clearDatabase() {
    this.vectorDB.clear();
    this.documents.clear();
  }
}
