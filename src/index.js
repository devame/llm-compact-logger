/**
 * LLM Compact Logger
 *
 * Generic token-efficient logger for LLM debugging
 * Framework-agnostic with adapters for popular test frameworks
 */

export { CompactLogger } from './compact-logger.js';
export { BaseAdapter } from './adapters/base-adapter.js';
export { VitestAdapter, VitestReporter } from './adapters/vitest-adapter.js';
export { JestAdapter, JestReporter } from './adapters/jest-adapter.js';
