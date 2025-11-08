/**
 * Vitest Adapter
 *
 * Converts Vitest test results into the standardized format
 * for CompactLogger. Can be used as a custom Vitest reporter.
 *
 * @usage
 * // vitest.config.js
 * import { VitestReporter } from 'llm-compact-logger/adapters/vitest';
 *
 * export default {
 *   test: {
 *     reporters: ['default', new VitestReporter()]
 *   }
 * }
 */

import { BaseAdapter } from './base-adapter.js';
import { CompactLogger } from '../compact-logger.js';
import { createEnhancers } from '../enhancements/index.js';

export class VitestAdapter extends BaseAdapter {
  convertFailure(vitestTask) {
    const result = vitestTask.result;
    const error = result?.errors?.[0] || {};

    return {
      name: vitestTask.name,
      location: {
        file: vitestTask.file?.filepath || vitestTask.file,
        line: vitestTask.location?.line
      },
      error: {
        type: error.name || 'Error',
        message: error.message || '',
        expected: error.expected,
        actual: error.actual,
        stack: error.stack
      }
    };
  }

  convertPass(vitestTask) {
    return {
      name: vitestTask.name,
      location: {
        file: vitestTask.file?.filepath || vitestTask.file
      },
      duration: vitestTask.result?.duration || 0
    };
  }

  extractSummary(files) {
    let total = 0;
    let passed = 0;
    let failed = 0;

    for (const file of files) {
      const stats = this.countTests(file.tasks || []);
      total += stats.total;
      passed += stats.passed;
      failed += stats.failed;
    }

    return {
      tot: total,
      pas: passed,
      fai: failed,
      rate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  }

  /**
   * Recursively count tests in Vitest task tree
   */
  countTests(tasks) {
    let total = 0;
    let passed = 0;
    let failed = 0;

    for (const task of tasks) {
      if (task.type === 'suite' && task.tasks) {
        const stats = this.countTests(task.tasks);
        total += stats.total;
        passed += stats.passed;
        failed += stats.failed;
      } else if (task.type === 'test') {
        total++;
        if (task.result?.state === 'pass') passed++;
        if (task.result?.state === 'fail') failed++;
      }
    }

    return { total, passed, failed };
  }

  /**
   * Process Vitest files and extract all results
   */
  processFiles(files) {
    const results = { failures: [], passes: [] };

    for (const file of files) {
      this.extractFromTasks(file.tasks || [], file.filepath, results);
    }

    return results;
  }

  /**
   * Recursively extract test results from Vitest task tree
   */
  extractFromTasks(tasks, filepath, results) {
    for (const task of tasks) {
      // Handle test suites (describe blocks)
      if (task.type === 'suite' && task.tasks) {
        this.extractFromTasks(task.tasks, filepath, results);
        continue;
      }

      // Handle individual tests
      if (task.type === 'test') {
        const taskWithFile = { ...task, file: filepath };

        if (task.result?.state === 'fail') {
          results.failures.push(this.convertFailure(taskWithFile));
        } else if (task.result?.state === 'pass') {
          results.passes.push(this.convertPass(taskWithFile));
        }
      }
    }
  }
}

/**
 * Vitest Reporter - implements Vitest's reporter interface
 */
export class VitestReporter {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || '.',
      // Enhancement options
      enhancements: {
        codeContext: options.enhancements?.codeContext !== false, // Default enabled
        stack: options.enhancements?.stack !== false, // Default enabled
        diff: options.enhancements?.diff !== false, // Default enabled
        rootCause: options.enhancements?.rootCause !== false, // Default enabled
        coverage: options.enhancements?.coverage !== false, // Default enabled
        links: options.enhancements?.links !== false, // Default enabled
        persistentIndex: options.enhancements?.persistentIndex || { enabled: false }
      },
      ...options
    };
    this.logger = null;
    this.adapter = null;
    this.enhancers = null;
  }

  onInit() {
    // Create logger and adapter when Vitest initializes
    this.logger = new CompactLogger({
      outputDir: this.options.outputDir,
      metadata: {
        framework: 'vitest',
        commit: this.getGitCommit()
      },
      ...this.options
    });

    this.adapter = new VitestAdapter(this.logger);

    // Create enhancers
    this.enhancers = createEnhancers({
      outputDir: this.options.outputDir,
      codeContext: this.options.enhancements.codeContext,
      stack: this.options.enhancements.stack,
      diff: this.options.enhancements.diff,
      rootCause: this.options.enhancements.rootCause,
      coverage: this.options.enhancements.coverage,
      links: this.options.enhancements.links,
      persistentIndex: this.options.enhancements.persistentIndex
    });
  }

  async onFinished(files = [], errors = []) {
    if (!this.logger || !this.adapter) {
      console.warn('VitestReporter: Logger not initialized, skipping report generation');
      return;
    }

    // Process all test results
    const results = this.adapter.processFiles(files);

    // Apply enhancements to failures
    let enhancedFailures = results.failures;

    if (this.enhancers) {
      // 1. Inline code context (highest ROI)
      if (this.enhancers.codeContext) {
        enhancedFailures = this.enhancers.codeContext.enhanceAll(enhancedFailures);
      }

      // 2. Smart diff formatting
      if (this.enhancers.diff) {
        enhancedFailures = this.enhancers.diff.enhanceAll(enhancedFailures);
      }

      // 3. Enhanced stack traces
      if (this.enhancers.stack) {
        enhancedFailures = this.enhancers.stack.enhanceAll(enhancedFailures);
      }

      // 4. Coverage integration (async)
      if (this.enhancers.coverage) {
        enhancedFailures = await this.enhancers.coverage.enhanceAll(enhancedFailures);
      }

      // 5. Quick links
      if (this.enhancers.links) {
        enhancedFailures = this.enhancers.links.enhanceAll(enhancedFailures, this.enhancers.index);
      }

      // 6. Root cause analysis (on all enhanced failures)
      let rootCauses = null;
      if (this.enhancers.rootCause && enhancedFailures.length > 0) {
        rootCauses = this.enhancers.rootCause.analyze(enhancedFailures);
      }

      // 7. Persistent index tracking
      if (this.enhancers.index) {
        const summary = this.adapter.extractSummary(files);
        const runId = this.enhancers.index.recordTestRun(summary, {
          framework: 'vitest',
          dur: Date.now()
        });

        if (runId) {
          // Record all results (passes and failures)
          const allTests = [
            ...enhancedFailures,
            ...results.passes.map(p => ({ ...p, e: null }))
          ];
          this.enhancers.index.recordTestResults(runId, allTests);

          // Enhance failures with historical data
          enhancedFailures = enhancedFailures.map(failure => {
            const history = this.enhancers.index.getTestHistory(failure.t, 5);
            const flaky = this.enhancers.index.getFlakiness(failure.t);

            if (history.length > 0 || flaky) {
              return {
                ...failure,
                history: {
                  lastPassed: history.find(h => h.status === 'pass')?.timestamp || null,
                  failCount: history.filter(h => h.status === 'fail').length,
                  totalRuns: history.length,
                  flaky
                }
              };
            }
            return failure;
          });
        }
      }

      // Add root cause analysis to logger metadata
      if (rootCauses && rootCauses.length > 0) {
        this.logger.metadata.rootCauses = rootCauses;
      }
    }

    // Log all enhanced failures and passes
    for (const failure of enhancedFailures) {
      this.logger.logFailure(failure);
    }

    for (const pass of results.passes) {
      this.logger.logPass(pass);
    }

    // Extract summary
    const summary = this.adapter.extractSummary(files);

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

      // Show root cause summary if available
      if (this.logger.metadata.rootCauses && this.logger.metadata.rootCauses.length > 0) {
        const topCause = this.logger.metadata.rootCauses[0];
        console.log(`   Root cause: ${topCause.pattern} (${topCause.confidence * 100}% confidence)`);
        console.log(`   Suggestion: ${topCause.suggestion}`);
      }
    }

    // Cleanup
    if (this.enhancers?.index) {
      this.enhancers.index.close();
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

export default VitestReporter;
