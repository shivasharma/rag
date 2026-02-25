/**
 * Feature-hashing embeddings (no external API required).
 *
 * Each text is converted to a fixed-size dense vector using the "hashing
 * trick": every token is hashed to a dimension index, and normalised TF
 * weights are accumulated into that slot.  The final vector is L2-normalised
 * so cosine similarity measures lexical overlap between texts.
 *
 * Same public interface as the previous Ollama-based implementation so no
 * other files need to change.
 */

const DIMS = 4096;

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','it','its','was','are','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','i','you','he','she','we','they','what',
  'which','who','how','when','where','not','no','as','if','so','up','out',
]);

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function textToVector(text) {
  const vector = new Array(DIMS).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) return vector;

  // Compute term frequency
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }

  // Hash each term into the vector
  for (const [token, freq] of tf) {
    const idx = djb2Hash(token) % DIMS;
    vector[idx] += freq / tokens.length;   // normalised TF weight
  }

  // L2 normalise
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < DIMS; i++) vector[i] /= norm;
  }

  return vector;
}

// ---------------------------------------------------------------------------
// EmbeddingGenerator — async interface kept identical to the Ollama version
// ---------------------------------------------------------------------------

export class EmbeddingGenerator {
  // baseUrl param kept for API compatibility but is unused
  constructor(_baseUrl) {}

  async getEmbedding(text) {
    return textToVector(text);
  }

  async getEmbeddingsBatch(texts) {
    return texts.map(t => textToVector(t));
  }
}

// ---------------------------------------------------------------------------
// Math utilities (unchanged)
// ---------------------------------------------------------------------------

export function cosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same dimension');
  }

  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < vec1.length; i++) {
    dot += vec1[i] * vec2[i];
    n1  += vec1[i] * vec1[i];
    n2  += vec2[i] * vec2[i];
  }

  n1 = Math.sqrt(n1);
  n2 = Math.sqrt(n2);
  if (n1 === 0 || n2 === 0) return 0;

  return dot / (n1 * n2);
}

export function l2Distance(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have same dimension');
  }

  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const d = vec1[i] - vec2[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}
