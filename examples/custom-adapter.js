/**
 * Example: Creating a custom adapter for your framework
 *
 * This example shows how to create an adapter for a hypothetical
 * testing framework called "MyTest".
 */

import { BaseAdapter } from '../src/adapters/base-adapter.js';
import { CompactLogger } from '../src/compact-logger.js';

/**
 * Step 1: Create your adapter by extending BaseAdapter
 */
class MyTestAdapter extends BaseAdapter {
  /**
   * Convert framework-specific failure to standard format
   */
  convertFailure(myTestFailure) {
    // Example MyTest failure object structure:
    // {
    //   testName: 'should do something',
    //   filePath: '/path/to/test.js',
    //   lineNumber: 42,
    //   error: {
    //     name: 'AssertionError',
    //     msg: 'Values don\'t match',
    //     want: 5,
    //     got: 3,
    //     trace: '...'
    //   }
    // }

    return {
      name: myTestFailure.testName,
      location: {
        file: myTestFailure.filePath,
        line: myTestFailure.lineNumber
      },
      error: {
        type: myTestFailure.error.name,
        message: myTestFailure.error.msg,
        expected: myTestFailure.error.want,
        actual: myTestFailure.error.got,
        stack: myTestFailure.error.trace
      }
    };
  }

  /**
   * Convert framework-specific pass to standard format
   */
  convertPass(myTestPass) {
    return {
      name: myTestPass.testName,
      location: {
        file: myTestPass.filePath,
        line: myTestPass.lineNumber
      },
      duration: myTestPass.executionTime
    };
  }

  /**
   * Extract summary statistics from framework results
   */
  extractSummary(myTestResults) {
    return {
      tot: myTestResults.totalTests,
      pas: myTestResults.passedTests,
      fai: myTestResults.failedTests,
      rate: Math.round((myTestResults.passedTests / myTestResults.totalTests) * 100)
    };
  }
}

/**
 * Step 2: Create a reporter that integrates with your framework
 */
class MyTestReporter {
  constructor(options = {}) {
    this.logger = new CompactLogger({
      outputDir: options.outputDir || './debug',
      metadata: {
        framework: 'mytest',
        ...options.metadata
      }
    });

    this.adapter = new MyTestAdapter(this.logger);
  }

  /**
   * Called when MyTest finishes running tests
   */
  async onComplete(results) {
    // Process failures
    for (const failure of results.failures) {
      const standardized = this.adapter.convertFailure(failure);
      this.logger.logFailure(standardized);
    }

    // Process passes
    for (const pass of results.passes) {
      const standardized = this.adapter.convertPass(pass);
      this.logger.logPass(standardized);
    }

    // Extract summary and finalize
    const summary = this.adapter.extractSummary(results);
    const metadata = await this.logger.finalize(summary);

    console.log(`\n📊 Reports: ${metadata.fullPath} (~${metadata.fullTokens} tokens)`);
  }
}

/**
 * Step 3: Use your adapter
 */
async function exampleUsage() {
  // Simulate MyTest results
  const mockResults = {
    totalTests: 10,
    passedTests: 7,
    failedTests: 3,
    failures: [
      {
        testName: 'should validate input',
        filePath: '/tests/validation.test.js',
        lineNumber: 42,
        error: {
          name: 'AssertionError',
          msg: 'Expected valid, got invalid',
          want: 'valid',
          got: 'invalid',
          trace: 'at validateInput (validation.js:15)'
        }
      }
    ],
    passes: [
      {
        testName: 'should format output',
        filePath: '/tests/format.test.js',
        lineNumber: 25,
        executionTime: 15
      }
    ]
  };

  // Create reporter and process results
  const reporter = new MyTestReporter({ outputDir: './debug' });
  await reporter.onComplete(mockResults);
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}

export { MyTestAdapter, MyTestReporter };
