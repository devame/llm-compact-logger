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
    this.options = options;
    this.logger = null;
    this.adapter = null;
  }

  onInit() {
    // Create logger and adapter when Vitest initializes
    this.logger = new CompactLogger({
      outputDir: this.options.outputDir || '.',
      metadata: {
        framework: 'vitest',
        commit: this.getGitCommit()
      },
      ...this.options
    });

    this.adapter = new VitestAdapter(this.logger);
  }

  async onFinished(files = [], errors = []) {
    if (!this.logger || !this.adapter) {
      console.warn('VitestReporter: Logger not initialized, skipping report generation');
      return;
    }

    // Process all test results
    const results = this.adapter.processFiles(files);

    // Log all failures and passes
    for (const failure of results.failures) {
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
