/**
 * Generic Compact Logger for LLM Debugging
 *
 * Framework-agnostic logger that generates token-efficient output
 * for AI-assisted debugging. Reduces token consumption by ~85-90%.
 *
 * @usage
 * const logger = new CompactLogger({ outputDir: './debug' });
 * logger.logFailure({
 *   name: 'test name',
 *   location: { file: 'test.js', line: 42 },
 *   error: { type: 'AssertionError', message: '...', expected: 5, actual: 3 }
 * });
 * await logger.finalize();
 */

export class CompactLogger {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || '.',
      compactFilename: options.compactFilename || 'debug-compact.json',
      fullFilename: options.fullFilename || 'debug-report.json',
      metadata: options.metadata || {},
      maxMessageLength: options.maxMessageLength || 200,
      ...options
    };

    this.failures = [];
    this.passes = [];
    this.startTime = Date.now();
    this.metadata = {
      ts: new Date().toISOString(),
      ...this.options.metadata
    };
  }

  /**
   * Log a test/check failure
   * @param {Object} failure - Standardized failure object
   * @param {string} failure.name - Test/check name
   * @param {Object} failure.location - Location info
   * @param {string} failure.location.file - File path
   * @param {number} [failure.location.line] - Line number
   * @param {Object} failure.error - Error details
   * @param {string} failure.error.type - Error type
   * @param {string} failure.error.message - Error message
   * @param {*} [failure.error.expected] - Expected value
   * @param {*} [failure.error.actual] - Actual value
   * @param {string} [failure.error.stack] - Stack trace
   */
  logFailure(failure) {
    const file = this.extractFilename(failure.location?.file);
    const line = failure.location?.line || '?';

    const compact = {
      t: failure.name,                                  // test/check name
      f: `${file}:${line}`,                            // file:line
      e: {                                             // error
        type: failure.error?.type || 'Error',
        msg: this.compactMessage(failure.error?.message || 'Unknown error'),
        E: this.compactValue(failure.error?.expected), // Expected
        R: this.compactValue(failure.error?.actual)    // Received
      }
    };

    // Add stack trace if available
    const stack = this.extractRelevantStack(failure.error?.stack, file);
    if (stack) {
      compact.stk = stack;
    }

    // Add any custom fields
    if (failure.context) {
      compact.ctx = failure.context;
    }

    this.failures.push(compact);
  }

  /**
   * Log a successful test/check
   * @param {Object} pass - Success info
   * @param {string} pass.name - Test/check name
   * @param {Object} pass.location - Location info
   * @param {number} [pass.duration] - Duration in ms
   */
  logPass(pass) {
    this.passes.push({
      t: pass.name,
      f: this.extractFilename(pass.location?.file),
      d: pass.duration || 0
    });
  }

  /**
   * Finalize and write reports
   * @param {Object} [summary] - Optional summary stats override
   * @returns {Promise<Object>} Report metadata
   */
  async finalize(summary = null) {
    const duration = Date.now() - this.startTime;

    // Calculate summary
    const totalTests = this.failures.length + this.passes.length;
    const sum = summary || {
      tot: totalTests,
      pas: this.passes.length,
      fai: this.failures.length,
      rate: totalTests > 0 ? Math.round((this.passes.length / totalTests) * 100) : 0
    };

    // Group failures by file
    const byFile = this.groupByFile(this.failures);

    // Find top failing error types
    const topFails = this.getTopErrorTypes(this.failures);

    // Build full report
    const fullReport = {
      meta: {
        ...this.metadata,
        dur: duration
      },
      sum,
      fails: this.failures,
      byFile,
      topFails,
      legend: {
        t: 'test name',
        f: 'file:line',
        e: 'error',
        E: 'expected',
        R: 'received',
        stk: 'stack',
        ctx: 'context',
        dur: 'duration (ms)',
        tot: 'total tests',
        pas: 'passed',
        fai: 'failed'
      }
    };

    // Build compact report (no legend, no metadata extras)
    const compactReport = {
      sum,
      fails: this.failures,
      topFails
    };

    // Write files
    const fs = await import('fs');
    const path = await import('path');

    const outputDir = this.options.outputDir;
    await fs.promises.mkdir(outputDir, { recursive: true });

    const fullPath = path.join(outputDir, this.options.fullFilename);
    const compactPath = path.join(outputDir, this.options.compactFilename);

    await fs.promises.writeFile(
      fullPath,
      JSON.stringify(fullReport, null, 2)
    );

    await fs.promises.writeFile(
      compactPath,
      JSON.stringify(compactReport)  // No pretty print
    );

    return {
      fullPath,
      compactPath,
      fullTokens: this.estimateTokens(fullReport),
      compactTokens: this.estimateTokens(compactReport),
      failures: this.failures.length,
      passes: this.passes.length
    };
  }

  // ===== Helper Methods =====

  extractFilename(filepath) {
    if (!filepath) return 'unknown';
    return filepath.split('/').pop().split('\\').pop();
  }

  compactMessage(message) {
    if (!message) return '';

    // Remove ANSI color codes
    const cleaned = message.replace(/\u001b\[[0-9;]*m/g, '');

    // Truncate if too long
    if (cleaned.length > this.options.maxMessageLength) {
      return cleaned.substring(0, this.options.maxMessageLength) + '...';
    }

    // Replace verbose symbols
    return cleaned
      .replace(/Object\.is equality/g, '≡')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  compactValue(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';

    // Handle objects/arrays - stringify and truncate
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      if (str.length > 100) {
        return str.substring(0, 100) + '...';
      }
      return str;
    }

    return String(value);
  }

  extractRelevantStack(stack, filename) {
    if (!stack) return null;

    // Find first line that mentions the test file
    const lines = stack.split('\n');
    for (const line of lines) {
      if (line.includes(filename)) {
        // Extract line:col from patterns like "file.js:123:45"
        const match = line.match(/(\d+):(\d+)/);
        if (match) {
          return `${match[1]}:${match[2]}`;
        }
      }
    }

    return null;
  }

  groupByFile(failures) {
    const byFile = {};
    for (const failure of failures) {
      const file = failure.f.split(':')[0];
      if (!byFile[file]) {
        byFile[file] = [];
      }
      byFile[file].push(failure.t);
    }
    return byFile;
  }

  getTopErrorTypes(failures) {
    const counts = {};
    for (const failure of failures) {
      const type = failure.e.type;
      counts[type] = (counts[type] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);  // Top 5
  }

  estimateTokens(obj) {
    // Rough estimate: 1 token ≈ 4 characters
    const str = JSON.stringify(obj);
    return Math.ceil(str.length / 4);
  }

  getMostFailingFile(byFile) {
    let max = 0;
    let file = 'none';
    for (const [f, tests] of Object.entries(byFile)) {
      if (tests.length > max) {
        max = tests.length;
        file = f;
      }
    }
    return `${file} (${max} failures)`;
  }

  getMostCommonError(failures) {
    const counts = {};
    for (const failure of failures) {
      const type = failure.e.type;
      counts[type] = (counts[type] || 0) + 1;
    }

    let maxCount = 0;
    let commonType = 'none';
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        commonType = type;
      }
    }

    return `${commonType} (${maxCount}x)`;
  }
}

export default CompactLogger;
