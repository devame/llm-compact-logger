/**
 * Enhancement 6: Function Coverage Map
 *
 * Integrates with V8 coverage data to show which functions were executed.
 * Uses existing Vitest coverage - just reads the JSON output.
 *
 * Difficulty: 🟡 Medium (with V8) OR 🔴 Very Hard (custom instrumentation)
 * ROI: High
 */

import fs from 'fs';
import path from 'path';

export class CoverageEnhancer {
  constructor(options = {}) {
    this.coverageDir = options.coverageDir || '.coverage';
    this.useCoverage = options.useCoverage !== false;
    this.maxFunctions = options.maxFunctions || 10;
  }

  /**
   * Enhance a failure with coverage information
   * @param {Object} failure - Standardized failure object
   * @returns {Promise<Object>} Enhanced failure
   */
  async enhance(failure) {
    if (!this.useCoverage) {
      return failure;
    }

    const coverage = await this.getCoverageForTest(
      failure.location?.file,
      failure.t
    );

    if (!coverage) {
      return failure;
    }

    // Build execution path from stack + coverage
    const executionPath = this.buildExecutionPath(failure.stk, coverage.functions);

    return {
      ...failure,
      coverage: {
        functions: coverage.functions.slice(0, this.maxFunctions),
        executionPath,
        totalFunctions: coverage.functions.length
      }
    };
  }

  /**
   * Get coverage data for a specific test
   * @param {string} testFile - Test file path
   * @param {string} testName - Test name
   * @returns {Promise<Object|null>} Coverage data or null
   */
  async getCoverageForTest(testFile, testName) {
    if (!this.useCoverage) return null;

    const coveragePath = path.join(this.coverageDir, 'coverage-final.json');

    // Check if coverage file exists
    if (!fs.existsSync(coveragePath)) {
      return null;
    }

    try {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const functions = this.extractCoveredFunctions(coverageData);

      return {
        functions,
        coverageFile: coveragePath
      };
    } catch (error) {
      // Coverage file not readable
      return null;
    }
  }

  /**
   * Extract covered functions from V8 coverage data
   * @param {Object} coverageData - V8 coverage JSON
   * @returns {Array} Covered functions
   */
  extractCoveredFunctions(coverageData) {
    const functions = [];

    for (const [file, data] of Object.entries(coverageData)) {
      // Skip test files and node_modules
      if (file.includes('test') || file.includes('node_modules')) {
        continue;
      }

      // V8 coverage includes function ranges
      const fileFunctions = data.functions || [];

      for (const fn of fileFunctions) {
        // Only include functions that were executed
        if (fn.count > 0) {
          functions.push({
            name: fn.functionName || '<anonymous>',
            file: this.relativePath(file),
            line: fn.ranges?.[0]?.startLine || 0,
            count: fn.count
          });
        }
      }
    }

    return functions;
  }

  /**
   * Build execution path from stack trace and coverage
   * @param {Array|string} stack - Stack trace (enhanced or string)
   * @param {Array} functions - Covered functions
   * @returns {Array} Execution path
   */
  buildExecutionPath(stack, functions) {
    if (!stack || !Array.isArray(stack)) {
      return [];
    }

    const path = [];

    for (const frame of stack) {
      // Match stack frame with covered function
      const frameFile = frame.at?.split(':')[0];
      const frameLine = frame.at ? parseInt(frame.at.split(':')[1]) : null;

      if (!frameFile || !frameLine) continue;

      // Find matching function (within ~5 lines)
      const matchingFn = functions.find(fn =>
        fn.file.includes(frameFile) && Math.abs(fn.line - frameLine) < 5
      );

      if (matchingFn) {
        path.push({
          fn: matchingFn.name,
          file: `${matchingFn.file}:${matchingFn.line}`,
          fromStack: true,
          calls: matchingFn.count
        });
      }
    }

    return path;
  }

  /**
   * Convert absolute path to relative
   * @param {string} file - File path
   * @returns {string} Relative path
   */
  relativePath(file) {
    try {
      return path.relative(process.cwd(), file);
    } catch {
      return file;
    }
  }

  /**
   * Check if coverage is available
   * @returns {boolean} True if coverage data exists
   */
  isCoverageAvailable() {
    const coveragePath = path.join(this.coverageDir, 'coverage-final.json');
    return fs.existsSync(coveragePath);
  }

  /**
   * Get coverage summary
   * @returns {Promise<Object|null>} Coverage summary or null
   */
  async getCoverageSummary() {
    if (!this.useCoverage || !this.isCoverageAvailable()) {
      return null;
    }

    try {
      const coveragePath = path.join(this.coverageDir, 'coverage-final.json');
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

      let totalFunctions = 0;
      let coveredFunctions = 0;
      let totalLines = 0;
      let coveredLines = 0;

      for (const data of Object.values(coverageData)) {
        if (data.functions) {
          totalFunctions += data.functions.length;
          coveredFunctions += data.functions.filter(f => f.count > 0).length;
        }

        if (data.statementMap) {
          totalLines += Object.keys(data.statementMap).length;
        }

        if (data.s) {
          coveredLines += Object.values(data.s).filter(count => count > 0).length;
        }
      }

      return {
        functions: {
          total: totalFunctions,
          covered: coveredFunctions,
          pct: totalFunctions > 0 ? ((coveredFunctions / totalFunctions) * 100).toFixed(2) : 0
        },
        lines: {
          total: totalLines,
          covered: coveredLines,
          pct: totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(2) : 0
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Enhance multiple failures with coverage
   * @param {Array} failures - Array of failures
   * @returns {Promise<Array>} Enhanced failures
   */
  async enhanceAll(failures) {
    const enhanced = [];

    for (const failure of failures) {
      enhanced.push(await this.enhance(failure));
    }

    return enhanced;
  }
}

export default CoverageEnhancer;
