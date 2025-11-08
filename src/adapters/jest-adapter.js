/**
 * Jest Adapter
 *
 * Converts Jest test results into the standardized format
 * for CompactLogger. Can be used as a custom Jest reporter.
 *
 * @usage
 * // jest.config.js
 * module.exports = {
 *   reporters: ['default', '<rootDir>/node_modules/llm-compact-logger/adapters/jest']
 * }
 */

import { BaseAdapter } from './base-adapter.js';
import { CompactLogger } from '../compact-logger.js';

export class JestAdapter extends BaseAdapter {
  convertFailure(jestTestResult, jestTest) {
    // Extract first failure message
    const failureMessage = jestTest.failureMessages?.[0] || '';

    // Try to extract expected/actual from Jest's assertion errors
    const expected = this.extractExpected(failureMessage);
    const actual = this.extractActual(failureMessage);

    return {
      name: jestTest.fullName || jestTest.title,
      location: {
        file: jestTestResult.testFilePath,
        line: jestTest.location?.line
      },
      error: {
        type: this.extractErrorType(failureMessage),
        message: this.cleanMessage(failureMessage),
        expected,
        actual,
        stack: failureMessage
      }
    };
  }

  convertPass(jestTestResult, jestTest) {
    return {
      name: jestTest.fullName || jestTest.title,
      location: {
        file: jestTestResult.testFilePath
      },
      duration: jestTest.duration || 0
    };
  }

  extractSummary(jestResults) {
    return {
      tot: jestResults.numTotalTests,
      pas: jestResults.numPassedTests,
      fai: jestResults.numFailedTests,
      rate: jestResults.numTotalTests > 0
        ? Math.round((jestResults.numPassedTests / jestResults.numTotalTests) * 100)
        : 0
    };
  }

  /**
   * Process Jest results
   */
  processResults(jestResults) {
    const results = { failures: [], passes: [] };

    for (const testResult of jestResults.testResults) {
      for (const test of testResult.testResults) {
        if (test.status === 'failed') {
          results.failures.push(this.convertFailure(testResult, test));
        } else if (test.status === 'passed') {
          results.passes.push(this.convertPass(testResult, test));
        }
      }
    }

    return results;
  }

  // Helper methods for parsing Jest's formatted output
  extractErrorType(message) {
    const match = message.match(/^(\w+Error):/);
    return match ? match[1] : 'Error';
  }

  extractExpected(message) {
    const match = message.match(/Expected:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  extractActual(message) {
    const match = message.match(/Received:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  cleanMessage(message) {
    // Extract just the assertion line, remove stack traces
    const lines = message.split('\n');
    for (const line of lines) {
      if (line.includes('expect') || line.includes('Received')) {
        return line.trim();
      }
    }
    return lines[0] || message;
  }
}

/**
 * Jest Reporter - implements Jest's reporter interface
 */
export class JestReporter {
  constructor(globalConfig, options = {}) {
    this.globalConfig = globalConfig;
    this.options = options;

    this.logger = new CompactLogger({
      outputDir: options.outputDir || '.',
      metadata: {
        framework: 'jest',
        commit: this.getGitCommit()
      },
      ...options
    });

    this.adapter = new JestAdapter(this.logger);
  }

  async onRunComplete(contexts, results) {
    // Process all test results
    const processed = this.adapter.processResults(results);

    // Log all failures and passes
    for (const failure of processed.failures) {
      this.logger.logFailure(failure);
    }

    for (const pass of processed.passes) {
      this.logger.logPass(pass);
    }

    // Extract summary
    const summary = this.adapter.extractSummary(results);

    // Finalize and write reports
    const metadata = await this.logger.finalize(summary);

    // Console output
    console.log('\n📊 Debug Reports Generated:');
    console.log(`   • ${metadata.fullPath}    (full, ~${metadata.fullTokens} tokens)`);
    console.log(`   • ${metadata.compactPath}   (compact, ~${metadata.compactTokens} tokens)`);

    if (metadata.failures > 0) {
      const byFile = this.logger.groupByFile(this.logger.failures);
      console.log('\n🔍 Quick Analysis:');
      console.log(`   Most failing: ${this.logger.getMostFailingFile(byFile)}`);
      console.log(`   Common error: ${this.logger.getMostCommonError(this.logger.failures)}`);
    }
  }

  getGitCommit() {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'local';
    }
  }
}

export default JestReporter;
