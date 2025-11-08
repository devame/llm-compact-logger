/**
 * Example: Using CompactLogger with Vitest
 *
 * This shows how to configure Vitest to use the compact logger reporter.
 */

// vitest.config.js
export default {
  test: {
    reporters: [
      'default',  // Keep standard output
      ['./node_modules/llm-compact-logger/src/adapters/vitest-adapter.js', {
        outputDir: './debug',
        compactFilename: 'test-failures-compact.json',
        fullFilename: 'test-failures-full.json'
      }]
    ],
    // ... other config
  }
};

/**
 * Or import directly:
 *
 * import { VitestReporter } from 'llm-compact-logger';
 *
 * export default {
 *   test: {
 *     reporters: [
 *       'default',
 *       new VitestReporter({
 *         outputDir: './debug'
 *       })
 *     ]
 *   }
 * };
 */
