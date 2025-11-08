/**
 * Base Adapter Interface
 *
 * All framework adapters should extend this class and implement
 * the conversion methods to translate framework-specific data
 * into the standardized CompactLogger format.
 */

export class BaseAdapter {
  constructor(logger) {
    if (!logger) {
      throw new Error('BaseAdapter requires a CompactLogger instance');
    }
    this.logger = logger;
  }

  /**
   * Convert framework-specific failure to standard format
   * @param {Object} frameworkFailure - Framework-specific failure object
   * @returns {Object} Standard failure object for CompactLogger
   */
  convertFailure(frameworkFailure) {
    throw new Error('convertFailure() must be implemented by adapter');
  }

  /**
   * Convert framework-specific pass to standard format
   * @param {Object} frameworkPass - Framework-specific pass object
   * @returns {Object} Standard pass object for CompactLogger
   */
  convertPass(frameworkPass) {
    throw new Error('convertPass() must be implemented by adapter');
  }

  /**
   * Extract summary statistics from framework results
   * @param {Object} frameworkResults - Framework-specific results
   * @returns {Object} Summary with tot, pas, fai, rate
   */
  extractSummary(frameworkResults) {
    throw new Error('extractSummary() must be implemented by adapter');
  }

  /**
   * Standard failure format specification
   * @typedef {Object} StandardFailure
   * @property {string} name - Test/check name
   * @property {Object} location - Location info
   * @property {string} location.file - File path
   * @property {number} [location.line] - Line number
   * @property {Object} error - Error details
   * @property {string} error.type - Error type (e.g., 'AssertionError')
   * @property {string} error.message - Error message
   * @property {*} [error.expected] - Expected value
   * @property {*} [error.actual] - Actual value
   * @property {string} [error.stack] - Stack trace
   * @property {Object} [context] - Additional context
   */

  /**
   * Standard pass format specification
   * @typedef {Object} StandardPass
   * @property {string} name - Test/check name
   * @property {Object} location - Location info
   * @property {string} location.file - File path
   * @property {number} [location.line] - Line number
   * @property {number} [duration] - Duration in ms
   */
}

export default BaseAdapter;
