import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentProcessor {
  static async processFile(filePath, originalName) {
    const extension = path.extname(originalName).toLowerCase();

    switch (extension) {
      case '.txt':
        return DocumentProcessor.processTxt(filePath);
      case '.pdf':
        return await DocumentProcessor.processPdf(filePath);
      case '.docx':
        return await DocumentProcessor.processDocx(filePath);
      case '.md':
        return DocumentProcessor.processMarkdown(filePath);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  static processTxt(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      return text;
    } catch (error) {
      throw new Error(`Error processing TXT file: ${error.message}`);
    }
  }

  static processMarkdown(filePath) {
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      return text;
    } catch (error) {
      throw new Error(`Error processing Markdown file: ${error.message}`);
    }
  }

  static async processPdf(filePath) {
    try {
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      return pdfData.text;
    } catch (error) {
      throw new Error(`Error processing PDF: ${error.message}`);
    }
  }

  static async processDocx(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`Error processing DOCX: ${error.message}`);
    }
  }
}

export class TextChunker {
  static chunkText(text, chunkSize = 500, overlap = 50) {
    if (text.length === 0) {
      return [];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end).trim();

      if (chunk.length > 10) {
        chunks.push(chunk);
      }

      start = end - overlap;

      if (start >= text.length - 10) {
        break;
      }
    }

    return chunks;
  }

  static chunkTextWithMetadata(text, source, chunkSize = 500, overlap = 50) {
    const chunks = TextChunker.chunkText(text, chunkSize, overlap);

    return chunks.map((chunk, index) => ({
      text: chunk,
      source,
      chunkId: index
    }));
  }
}