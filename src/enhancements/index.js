/**
 * LLM Compact Logger - Enhancements Module
 *
 * Collection of optional enhancements for the compact logger.
 * Each enhancement can be enabled/disabled independently.
 */

export { InlineCodeContextEnhancer } from './inline-code-context.js';
export { StackEnhancer } from './stack-enhancer.js';
export { SmartDiffEnhancer } from './smart-diff.js';
export { RootCauseAnalyzer } from './root-cause-analyzer.js';
export { PersistentIndex } from './persistent-index.js';
export { CoverageEnhancer } from './coverage-enhancer.js';
export { QuickLinksGenerator } from './quick-links.js';

/**
 * Create all enhancers with options
 * @param {Object} options - Configuration options
 * @returns {Object} Object containing all enhancers
 */
export function createEnhancers(options = {}) {
  return {
    codeContext: new InlineCodeContextEnhancer(options.codeContext),
    stack: new StackEnhancer(options.stack),
    diff: new SmartDiffEnhancer(options.diff),
    rootCause: new RootCauseAnalyzer(options.rootCause),
    coverage: new CoverageEnhancer(options.coverage),
    links: new QuickLinksGenerator(options.links),
    // Persistent index created separately as it needs outputDir
    index: options.persistentIndex?.enabled
      ? new PersistentIndex(options.outputDir || '.', options.persistentIndex)
      : null
  };
}

export default createEnhancers;
