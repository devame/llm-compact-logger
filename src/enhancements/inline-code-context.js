/**
 * Enhancement 1: Inline Code Context
 *
 * Extracts the failing line of code and surrounding context from test files.
 * Zero coupling - only reads files that Vitest already provides paths for.
 *
 * Difficulty: 🟢 Easy
 * ROI: ⭐ HIGHEST
 */

import fs from 'fs';

export class InlineCodeContextEnhancer {
  constructor(options = {}) {
    this.contextLines = options.contextLines || 3; // Lines before and after
  }

  /**
   * Enhance a failure with inline code context
   * @param {Object} failure - Standardized failure object
   * @returns {Object} Enhanced failure with code context
   */
  enhance(failure) {
    if (!failure.location?.file || !failure.error?.stack) {
      return failure;
    }

    const errorLine = this.parseErrorLine(failure.error.stack, failure.location.file);

    if (!errorLine) {
      return failure;
    }

    const codeContext = this.extractTestCode(failure.location.file, errorLine);

    if (!codeContext) {
      return failure;
    }

    return {
      ...failure,
      code: codeContext
    };
  }

  /**
   * Parse the error line number from stack trace
   * @param {string} stack - Stack trace string
   * @param {string} testFile - Test file path to find in stack
   * @returns {number|null} Line number or null
   */
  parseErrorLine(stack, testFile) {
    if (!stack) return null;

    const lines = stack.split('\n');
    const filename = testFile.split('/').pop().split('\\').pop();

    for (const line of lines) {
      if (line.includes(filename)) {
        // Parse standard V8 stack trace format: "at ... file.js:123:45"
        const match = line.match(/:(\d+):(\d+)/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }

    return null;
  }

  /**
   * Extract code context around the failing line
   * @param {string} testFile - Path to test file
   * @param {number} errorLine - Line number where error occurred
   * @returns {Object|null} Code context object or null
   */
  extractTestCode(testFile, errorLine) {
    try {
      const content = fs.readFileSync(testFile, 'utf8');
      const lines = content.split('\n');

      // Bounds checking
      if (errorLine < 1 || errorLine > lines.length) {
        return null;
      }

      const startLine = Math.max(0, errorLine - this.contextLines - 1);
      const endLine = Math.min(lines.length, errorLine + this.contextLines);

      // Extract context lines
      const contextLines = lines.slice(startLine, endLine);

      // Find the failing line within the context
      const failingLineIndex = errorLine - startLine - 1;
      const failingLine = lines[errorLine - 1];

      return {
        fail: failingLine?.trim(),
        ctx: contextLines.map(l => l.trim()).filter(l => l.length > 0),
        line: {
          start: startLine + 1,
          failing: errorLine,
          end: endLine
        }
      };
    } catch (error) {
      // If we can't read the file, just return null (graceful degradation)
      return null;
    }
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

export default InlineCodeContextEnhancer;
