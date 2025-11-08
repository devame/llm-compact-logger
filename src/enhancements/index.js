/**
 * LLM Compact Logger - Enhancements Module
 *
 * Collection of optional enhancements for the compact logger.
 * Each enhancement can be enabled/disabled independently.
 */

// Re-export for direct imports
export { InlineCodeContextEnhancer } from './inline-code-context.js';
export { StackEnhancer } from './stack-enhancer.js';
export { SmartDiffEnhancer } from './smart-diff.js';
export { RootCauseAnalyzer } from './root-cause-analyzer.js';
export { PersistentIndex } from './persistent-index.js';
export { CoverageEnhancer } from './coverage-enhancer.js';
export { QuickLinksGenerator } from './quick-links.js';

/**
 * Create enhancers based on configuration
 * Only instantiates enhancers that are explicitly enabled
 *
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Object containing enabled enhancers
 */
export async function createEnhancers(options = {}) {
  const enhancers = {};

  // Helper to check if an option is enabled
  const isEnabled = (opt) => opt !== false && opt !== undefined;

  try {
    // 1. Inline Code Context
    if (isEnabled(options.codeContext)) {
      const { InlineCodeContextEnhancer } = await import('./inline-code-context.js');
      enhancers.codeContext = new InlineCodeContextEnhancer(
        typeof options.codeContext === 'object' ? options.codeContext : {}
      );
    }

    // 2. Smart Diff
    if (isEnabled(options.diff)) {
      const { SmartDiffEnhancer } = await import('./smart-diff.js');
      enhancers.diff = new SmartDiffEnhancer(
        typeof options.diff === 'object' ? options.diff : {}
      );
    }

    // 3. Enhanced Stack
    if (isEnabled(options.stack)) {
      const { StackEnhancer } = await import('./stack-enhancer.js');
      enhancers.stack = new StackEnhancer(
        typeof options.stack === 'object' ? options.stack : {}
      );
    }

    // 4. Root Cause Analysis
    if (isEnabled(options.rootCause)) {
      const { RootCauseAnalyzer } = await import('./root-cause-analyzer.js');
      enhancers.rootCause = new RootCauseAnalyzer(
        typeof options.rootCause === 'object' ? options.rootCause : {}
      );
    }

    // 5. Coverage Integration
    if (isEnabled(options.coverage)) {
      const { CoverageEnhancer } = await import('./coverage-enhancer.js');
      enhancers.coverage = new CoverageEnhancer(
        typeof options.coverage === 'object' ? options.coverage : {}
      );
    }

    // 6. Quick Links
    if (isEnabled(options.links)) {
      const { QuickLinksGenerator } = await import('./quick-links.js');
      enhancers.links = new QuickLinksGenerator(
        typeof options.links === 'object' ? options.links : {}
      );
    }

    // 7. Persistent Index (requires outputDir)
    if (options.persistentIndex?.enabled) {
      const { PersistentIndex } = await import('./persistent-index.js');
      enhancers.index = new PersistentIndex(
        options.outputDir || '.',
        options.persistentIndex
      );
    }
  } catch (error) {
    console.warn(`Failed to load some enhancements: ${error.message}`);
  }

  return enhancers;
}

export default createEnhancers;
