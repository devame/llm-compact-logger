/**
 * Example Vitest Configuration with All Enhancements Enabled
 *
 * This shows how to configure the LLM Compact Logger with all
 * available enhancements for maximum debugging power.
 */

import { defineConfig } from 'vitest/config';
import { VitestReporter } from 'llm-compact-logger/adapters/vitest';

export default defineConfig({
  test: {
    // Enable coverage for the Coverage Enhancement
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['json', 'text'],
      reportsDirectory: '.coverage'
    },

    reporters: [
      'default', // Keep the default Vitest reporter

      // LLM Compact Logger with all enhancements
      new VitestReporter({
        outputDir: './debug',

        // Enhancement configuration
        enhancements: {
          // 1. Inline Code Context - Shows failing code with context (HIGHEST ROI)
          codeContext: {
            contextLines: 3 // Lines before/after the failing line
          },

          // 2. Smart Diff - Intelligent actual vs expected comparison
          diff: {
            maxDepth: 3,
            maxArrayItems: 5,
            maxObjectKeys: 5
          },

          // 3. Enhanced Stack Traces - Function names + source code
          stack: {
            maxFrames: 5,
            maxCodeLength: 80
          },

          // 4. Root Cause Analysis - Pattern matching and suggestions
          rootCause: {
            minGroupSize: 2,
            maxSuggestions: 5
          },

          // 5. Coverage Integration - Shows which functions were executed
          coverage: {
            useCoverage: true,
            coverageDir: '.coverage',
            maxFunctions: 10
          },

          // 6. Quick Links - IDE links and git blame
          links: {
            trackGit: true,
            maxRelatedTests: 3
          },

          // 7. Persistent Index - Historical tracking with SQLite
          // NOTE: Requires 'better-sqlite3' package
          persistentIndex: {
            enabled: true,
            path: '.test-index',
            retentionDays: 30,
            trackGit: true
          }
        }
      })
    ]
  }
});
