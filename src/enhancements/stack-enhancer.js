/**
 * Enhancement 3: Call Stack with Function Names
 *
 * Enhances stack traces with actual source code lines and function names.
 * Zero coupling - just reads files referenced in stack trace.
 *
 * Difficulty: 🟢 Easy
 * ROI: High
 */

import fs from 'fs';
import path from 'path';

export class StackEnhancer {
  constructor(options = {}) {
    this.maxFrames = options.maxFrames || 5;
    this.maxCodeLength = options.maxCodeLength || 80;
  }

  /**
   * Enhance a failure with enhanced stack trace
   * @param {Object} failure - Standardized failure object
   * @returns {Object} Enhanced failure with detailed stack
   */
  enhance(failure) {
    if (!failure.error?.stack) {
      return failure;
    }

    const testFile = failure.location?.file;
    const frames = this.parseStack(failure.error.stack);
    const enhancedFrames = frames
      .map(frame => this.enhanceFrame(frame, testFile))
      .filter(frame => frame !== null)
      .slice(0, this.maxFrames);

    if (enhancedFrames.length === 0) {
      return failure;
    }

    // Replace the compact stack with enhanced version
    return {
      ...failure,
      stk: enhancedFrames
    };
  }

  /**
   * Parse stack trace into frames
   * @param {string} stack - Stack trace string
   * @returns {Array} Array of stack frames
   */
  parseStack(stack) {
    if (!stack) return [];

    const frames = [];
    const lines = stack.split('\n');

    // Standard V8 stack trace format:
    // "at functionName (file.js:123:45)" or "at file.js:123:45"
    const frameRegex = /at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+)|([^)]+))\)?/;

    for (const line of lines) {
      const match = line.match(frameRegex);
      if (match) {
        frames.push({
          function: match[1] || null,
          file: match[2] || match[5],
          line: match[3] ? parseInt(match[3]) : null,
          column: match[4] ? parseInt(match[4]) : null
        });
      }
    }

    return frames;
  }

  /**
   * Enhance a single stack frame with source code
   * @param {Object} frame - Stack frame object
   * @param {string} testFile - Path to the test file
   * @returns {Object|null} Enhanced frame or null
   */
  enhanceFrame(frame, testFile) {
    if (!frame.file || !frame.line) {
      return null;
    }

    const codeLine = this.readSourceLine(frame.file, frame.line);
    const isTestFile = testFile && frame.file.includes(path.basename(testFile));

    return {
      fn: frame.function || '<anonymous>',
      at: `${this.shortenPath(frame.file)}:${frame.line}`,
      code: codeLine ? this.truncateCode(codeLine) : null,
      test: isTestFile
    };
  }

  /**
   * Read a specific line from a source file
   * @param {string} file - File path
   * @param {number} line - Line number (1-indexed)
   * @returns {string|null} Source code line or null
   */
  readSourceLine(file, line) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      return lines[line - 1] || null;
    } catch (error) {
      // File not readable, gracefully degrade
      return null;
    }
  }

  /**
   * Shorten file path for display
   * @param {string} filepath - Full file path
   * @returns {string} Shortened path
   */
  shortenPath(filepath) {
    if (!filepath) return 'unknown';

    // Remove common prefixes
    const cleaned = filepath
      .replace(/^.*\/node_modules\//, 'node_modules/')
      .replace(/^.*\/src\//, 'src/')
      .replace(/^.*\/test\//, 'test/');

    // If still too long, just show filename
    if (cleaned.length > 50) {
      return path.basename(filepath);
    }

    return cleaned;
  }

  /**
   * Truncate code line for display
   * @param {string} code - Source code line
   * @returns {string} Truncated code
   */
  truncateCode(code) {
    const trimmed = code.trim();
    if (trimmed.length <= this.maxCodeLength) {
      return trimmed;
    }
    return trimmed.substring(0, this.maxCodeLength) + '...';
  }

  /**
   * Enhance multiple failures in batch
   * @param {Array} failures - Array of failures
   * @returns {Array} Enhanced failures
   */
  enhanceAll(failures) {
    return failures.map(failure => this.enhance(failure));
  }
}

export default StackEnhancer;
