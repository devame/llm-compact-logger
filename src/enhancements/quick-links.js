/**
 * Enhancement 7: Quick Links / Pointers
 *
 * Generates IDE-compatible links and git blame information.
 * Low coupling - git commands are optional with graceful degradation.
 *
 * Difficulty: 🟢 Very Easy
 * ROI: Medium
 */

import path from 'path';
import { execSync } from 'child_process';

export class QuickLinksGenerator {
  constructor(options = {}) {
    this.trackGit = options.trackGit !== false; // Default true
    this.maxRelatedTests = options.maxRelatedTests || 3;
  }

  /**
   * Generate quick links for a failure
   * @param {Object} failure - Standardized failure object
   * @param {Object} [index] - Optional persistent index for related tests
   * @returns {Promise<Object>} Links object
   */
  async generate(failure, index = null) {
    const links = {};

    // Link to test file
    if (failure.location?.file) {
      const line = failure.location?.line || 1;
      links.test = this.fileLink(failure.location.file, line, path.basename(failure.location.file));
    }

    // Link to source file (from stack trace)
    if (failure.stk && Array.isArray(failure.stk)) {
      const sourceFrame = failure.stk.find(f => !f.test);
      if (sourceFrame) {
        const match = sourceFrame.at.match(/(.+):(\d+)/);
        if (match) {
          const file = match[1];
          const line = parseInt(match[2]);
          links.source = this.fileLink(file, line, path.basename(file));

          // Git blame for last change
          if (this.trackGit) {
            links.lastChange = this.gitBlame(file, line);
          }
        }
      }
    }

    // Related tests (if index available)
    if (index && failure.errorHash) {
      try {
        const similar = await index.findSimilarFailures(failure.errorHash);
        if (similar && similar.length > 0) {
          links.relatedTests = similar
            .slice(0, this.maxRelatedTests)
            .map(t => ({
              test: t.test_name,
              file: t.file,
              occurrences: t.occurrences
            }));
        }
      } catch (error) {
        // Gracefully handle index errors
      }
    }

    return Object.keys(links).length > 0 ? links : null;
  }

  /**
   * Generate file link in multiple formats
   * @param {string} file - File path
   * @param {number} line - Line number
   * @param {string} [label] - Optional label
   * @returns {Object} Link object with multiple formats
   */
  fileLink(file, line, label = null) {
    const absPath = path.resolve(file);

    return {
      label: label || path.basename(file),
      vscode: `vscode://file/${absPath}:${line}`,
      idea: `idea://open?file=${absPath}&line=${line}`,
      file: `file://${absPath}:${line}`,
      path: absPath,
      line: line
    };
  }

  /**
   * Get git blame information for a file
   * @param {string} file - File path
   * @param {number} [line] - Optional line number for specific line blame
   * @returns {string|null} Git blame info or null
   */
  gitBlame(file, line = null) {
    if (!this.trackGit) return null;

    try {
      let command;
      if (line) {
        // Blame specific line
        command = `git log -1 --format="%h %ar %an: %s" -L ${line},${line}:${file}`;
      } else {
        // Last commit that touched the file
        command = `git log -1 --format="%h %ar %an: %s" -- ${file}`;
      }

      const blame = execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
      }).trim();

      return blame || null;
    } catch (error) {
      // Git not available or file not in repo
      return null;
    }
  }

  /**
   * Get current git commit hash
   * @returns {string|null} Commit hash or null
   */
  getGitCommit() {
    if (!this.trackGit) return null;

    try {
      return execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current git branch
   * @returns {string|null} Branch name or null
   */
  getGitBranch() {
    if (!this.trackGit) return null;

    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get git info for metadata
   * @returns {Object} Git info object
   */
  getGitInfo() {
    return {
      hash: this.getGitCommit(),
      branch: this.getGitBranch()
    };
  }

  /**
   * Enhance multiple failures with links
   * @param {Array} failures - Array of failures
   * @param {Object} [index] - Optional persistent index
   * @returns {Promise<Array>} Enhanced failures
   */
  async enhanceAll(failures, index = null) {
    return Promise.all(
      failures.map(async (failure) => {
        const links = await this.generate(failure, index);
        return links ? { ...failure, links } : failure;
      })
    );
  }
}

export default QuickLinksGenerator;
