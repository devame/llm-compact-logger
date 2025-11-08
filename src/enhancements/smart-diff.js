/**
 * Enhancement 2: Actual vs Expected with Structure
 *
 * Provides intelligent diff formatting with structure analysis and hints.
 * Low coupling - uses standard Error object properties.
 *
 * Difficulty: 🟡 Medium
 * ROI: High
 */

import crypto from 'crypto';

export class SmartDiffEnhancer {
  constructor(options = {}) {
    this.maxDepth = options.maxDepth || 3;
    this.maxArrayItems = options.maxArrayItems || 5;
    this.maxObjectKeys = options.maxObjectKeys || 5;
  }

  /**
   * Enhance a failure with smart diff analysis
   * @param {Object} failure - Standardized failure object
   * @returns {Object} Enhanced failure with structured diff
   */
  enhance(failure) {
    if (!failure.error) {
      return failure;
    }

    const structured = this.extractStructuredData(failure.error);

    if (!structured) {
      // Try to parse from error message
      const parsed = this.parseFromMessage(failure.error);
      if (parsed) {
        return {
          ...failure,
          e: {
            ...failure.e,
            ...parsed
          }
        };
      }
      return failure;
    }

    // Build enhanced error object
    const enhanced = {
      type: failure.error.type || 'Error',
      msg: failure.error.message,
      actual: this.simplifyStructure(structured.actual),
      expected: this.simplifyStructure(structured.expected),
      hint: this.generateHint(structured)
    };

    // Generate structural diff if both are objects
    if (typeof structured.actual === 'object' && typeof structured.expected === 'object') {
      enhanced.diff = this.generateStructuralDiff(structured);
    }

    return {
      ...failure,
      e: enhanced
    };
  }

  /**
   * Extract structured data from error
   * @param {Object} error - Error object
   * @returns {Object|null} Structured data or null
   */
  extractStructuredData(error) {
    // Vitest/Chai: error.actual and error.expected
    if (error.actual !== undefined && error.expected !== undefined) {
      return { actual: error.actual, expected: error.expected };
    }

    // Jest: error.matcherResult
    if (error.matcherResult) {
      return {
        actual: error.matcherResult.actual,
        expected: error.matcherResult.expected
      };
    }

    return null;
  }

  /**
   * Parse actual/expected from error message
   * @param {Object} error - Error object
   * @returns {Object|null} Parsed data or null
   */
  parseFromMessage(error) {
    if (!error.message) return null;

    const msg = error.message;

    // Try to parse common patterns
    // Pattern: "expected X to be Y"
    const toBe = msg.match(/expected\s+(.+?)\s+to\s+(?:be|equal)\s+(.+)/i);
    if (toBe) {
      return {
        msg: msg,
        actual: this.parseValue(toBe[1]),
        expected: this.parseValue(toBe[2])
      };
    }

    // Pattern: "Expected: X, Received: Y"
    const expectedReceived = msg.match(/Expected:\s*(.+?)(?:,|\n)\s*Received:\s*(.+)/i);
    if (expectedReceived) {
      return {
        msg: msg,
        actual: this.parseValue(expectedReceived[2]),
        expected: this.parseValue(expectedReceived[1])
      };
    }

    return null;
  }

  /**
   * Parse a value from string
   * @param {string} str - String value
   * @returns {*} Parsed value
   */
  parseValue(str) {
    const trimmed = str.trim();

    // Try to parse as JSON
    try {
      return JSON.parse(trimmed);
    } catch {
      // Return as string
      return trimmed;
    }
  }

  /**
   * Simplify complex structures for display
   * @param {*} obj - Object to simplify
   * @param {number} [depth] - Current depth
   * @returns {*} Simplified structure
   */
  simplifyStructure(obj, depth = 0) {
    if (depth >= this.maxDepth) return '...';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    // Arrays
    if (Array.isArray(obj)) {
      if (obj.length === 0) return [];
      if (obj.length <= this.maxArrayItems) {
        return obj.map(item => this.simplifyStructure(item, depth + 1));
      }
      // Show first few items
      const simplified = obj.slice(0, this.maxArrayItems).map(item =>
        this.simplifyStructure(item, depth + 1)
      );
      return `[${obj.length} items]: ${JSON.stringify(simplified)}...`;
    }

    // Objects
    const keys = Object.keys(obj);
    if (keys.length === 0) return {};

    const simplified = {};
    const keysToShow = keys.slice(0, this.maxObjectKeys);

    for (const key of keysToShow) {
      simplified[key] = this.simplifyStructure(obj[key], depth + 1);
    }

    if (keys.length > this.maxObjectKeys) {
      simplified['...'] = `${keys.length - this.maxObjectKeys} more keys`;
    }

    return simplified;
  }

  /**
   * Generate hints based on actual vs expected comparison
   * @param {Object} structured - Structured data
   * @returns {string|null} Hint or null
   */
  generateHint(structured) {
    const { actual, expected } = structured;

    // Type mismatch
    const actualType = Array.isArray(actual) ? 'array' : typeof actual;
    const expectedType = Array.isArray(expected) ? 'array' : typeof expected;

    if (actualType !== expectedType) {
      return `Type mismatch: got ${actualType} but expected ${expectedType}`;
    }

    // Array vs object structure issue
    if (Array.isArray(actual) && typeof expected === 'object' && !Array.isArray(expected)) {
      return 'Expected object but got array - check structure';
    }

    // Array length mismatch
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (actual.length !== expected.length) {
        return `Array length mismatch: got ${actual.length} items but expected ${expected.length}`;
      }
    }

    // Undefined property access pattern
    if (actual === undefined && expected !== undefined) {
      return 'Got undefined - property may not exist or object structure differs';
    }

    // Null vs undefined
    if (actual === null && expected !== null && expected !== undefined) {
      return 'Got null - check for null initialization or missing data';
    }

    // Object property mismatch
    if (typeof actual === 'object' && typeof expected === 'object' && actual && expected) {
      const actualKeys = Object.keys(actual);
      const expectedKeys = Object.keys(expected);

      const missing = expectedKeys.filter(k => !actualKeys.includes(k));
      const extra = actualKeys.filter(k => !expectedKeys.includes(k));

      if (missing.length > 0) {
        return `Missing properties: ${missing.join(', ')}`;
      }
      if (extra.length > 0) {
        return `Unexpected properties: ${extra.join(', ')}`;
      }
    }

    return null;
  }

  /**
   * Generate structural diff
   * @param {Object} structured - Structured data
   * @returns {Object} Diff object
   */
  generateStructuralDiff(structured) {
    const { actual, expected } = structured;

    if (!actual || !expected || typeof actual !== 'object' || typeof expected !== 'object') {
      return null;
    }

    const diff = {
      type: Array.isArray(actual) ? 'array' : 'object'
    };

    if (Array.isArray(actual) && Array.isArray(expected)) {
      diff.lengthDiff = actual.length - expected.length;
    } else {
      const actualKeys = Object.keys(actual);
      const expectedKeys = Object.keys(expected);

      diff.missing = expectedKeys.filter(k => !actualKeys.includes(k));
      diff.extra = actualKeys.filter(k => !expectedKeys.includes(k));
      diff.common = actualKeys.filter(k => expectedKeys.includes(k));
    }

    return diff;
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

export default SmartDiffEnhancer;
