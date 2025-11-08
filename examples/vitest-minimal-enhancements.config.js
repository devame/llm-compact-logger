/**
 * Minimal Vitest Configuration with Essential Enhancements
 *
 * This configuration enables only the most valuable enhancements
 * with zero additional dependencies.
 */

import { defineConfig } from 'vitest/config';
import { VitestReporter } from 'llm-compact-logger/adapters/vitest';

export default defineConfig({
  test: {
    reporters: [
      'default',

      new VitestReporter({
        outputDir: './debug',

        // Only enable the highest ROI enhancements (all enabled by default)
        enhancements: {
          codeContext: true,    // Shows failing code - HIGHEST ROI
          diff: true,           // Smart diff formatting
          stack: true,          // Enhanced stack traces
          rootCause: true,      // Pattern analysis
          links: true,          // IDE links
          coverage: false,      // Disable (requires coverage setup)
          persistentIndex: {    // Disable (requires better-sqlite3)
            enabled: false
          }
        }
      })
    ]
  }
});
