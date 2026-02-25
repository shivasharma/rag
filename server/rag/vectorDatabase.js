import { cosineSimilarity, l2Distance } from './embeddings.js';

export class VectorDatabase {
  constructor() {
    this.vectors = [];
  }

  addVector(item) {
    if (!item.embedding || !Array.isArray(item.embedding)) {
      throw new Error('Invalid embedding');
    }

    if (!item.text || !item.source) {
      throw new Error('Missing text or source');
    }

    this.vectors.push({
      id: item.id,
      embedding: item.embedding,
      text: item.text,
      source: item.source,
      chunkId: item.chunkId || 0,
      addedAt: new Date()
    });
  }

  search(queryEmbedding, k = 3) {
    if (this.vectors.length === 0) {
      return [];
    }

    const similarities = this.vectors.map((item, index) => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding),
      index
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, Math.min(k, similarities.length));
  }

  getById(id) {
    return this.vectors.find(v => v.id === id);
  }

  getAll() {
    return this.vectors;
  }

  getSize() {
    return this.vectors.length;
  }

  clear() {
    this.vectors = [];
  }

  getStats() {
    const counts = new Map();
    for (const v of this.vectors) {
      counts.set(v.source, (counts.get(v.source) ?? 0) + 1);
    }

    return {
      totalVectors: this.vectors.length,
      totalDocuments: counts.size,
      documentBreakdown: Array.from(counts.entries()).map(([source, chunks]) => ({ source, chunks }))
    };
  }
}