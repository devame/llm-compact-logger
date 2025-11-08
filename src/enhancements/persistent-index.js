/**
 * Enhancement 4: Persistent Index Database
 *
 * Stores test history in SQLite for trend analysis and flakiness detection.
 * Uses better-sqlite3 for embedded database with zero configuration.
 *
 * Difficulty: 🔴 Medium-Hard
 * ROI: ⭐ HIGH VALUE
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

/**
 * Persistent test history index
 * Optional dependency on better-sqlite3 - gracefully degrades if not installed
 */
export class PersistentIndex {
  constructor(outputDir, options = {}) {
    this.enabled = options.enabled !== false;
    this.dbPath = path.join(outputDir, '.test-index', 'history.db');
    this.retentionDays = options.retentionDays || 30;
    this.trackGit = options.trackGit !== false;
    this.db = null;
    this.initPromise = null;
    this.initialized = false;
  }

  /**
   * Initialize the database (async, called lazily on first use)
   * @returns {Promise<boolean>} True if initialized successfully
   */
  async initialize() {
    if (this.initialized) {
      return this.enabled;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.enabled;
    }

    this.initPromise = (async () => {
      try {
        if (!this.enabled) {
          this.initialized = true;
          return;
        }

        // Try to load better-sqlite3
        const Database = await this.loadDatabase();
        if (!Database) {
          console.warn('PersistentIndex: better-sqlite3 not installed, history tracking disabled');
          this.enabled = false;
          this.initialized = true;
          return;
        }

        // Create directory if needed
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Open database
        this.db = new Database(this.dbPath);
        this.setupSchema();
        this.cleanup();
        this.initialized = true;
      } catch (error) {
        console.warn(`PersistentIndex: Failed to initialize database: ${error.message}`);
        this.enabled = false;
        this.initialized = true;
      }
    })();

    await this.initPromise;
    return this.enabled;
  }

  /**
   * Load the better-sqlite3 module (optional dependency)
   * @returns {Promise<Function|null>} Database constructor or null
   */
  async loadDatabase() {
    try {
      // ESM-compatible dynamic import
      const mod = await import('better-sqlite3');
      return mod.default || mod;
    } catch (error) {
      return null;
    }
  }

  /**
   * Setup database schema
   */
  setupSchema() {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        git_hash TEXT,
        git_branch TEXT,
        total_tests INTEGER,
        passed INTEGER,
        failed INTEGER,
        duration_ms INTEGER,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        test_name TEXT NOT NULL,
        file TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_ms INTEGER,
        error_type TEXT,
        error_message TEXT,
        error_hash TEXT,
        stack_trace TEXT,
        FOREIGN KEY(run_id) REFERENCES runs(id)
      );

      CREATE INDEX IF NOT EXISTS idx_test_name ON results(test_name);
      CREATE INDEX IF NOT EXISTS idx_error_hash ON results(error_hash);
      CREATE INDEX IF NOT EXISTS idx_status ON results(status);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON runs(timestamp);
    `);
  }

  /**
   * Record a test run
   * @param {Object} summary - Test run summary
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<number|null>} Run ID or null
   */
  async recordTestRun(summary, metadata = {}) {
    await this.initialize();
    if (!this.db || !this.enabled) return null;

    try {
      const gitInfo = this.getGitInfo();

      const insert = this.db.prepare(`
        INSERT INTO runs (timestamp, git_hash, git_branch, total_tests, passed, failed, duration_ms, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insert.run(
        new Date().toISOString(),
        gitInfo.hash,
        gitInfo.branch,
        summary.tot || 0,
        summary.pas || 0,
        summary.fai || 0,
        metadata.dur || 0,
        JSON.stringify(metadata)
      );

      return result.lastInsertRowid;
    } catch (error) {
      console.warn(`PersistentIndex: Failed to record test run: ${error.message}`);
      return null;
    }
  }

  /**
   * Record test results for a run
   * @param {number} runId - Run ID
   * @param {Array} tests - Test results
   * @returns {Promise<void>}
   */
  async recordTestResults(runId, tests) {
    await this.initialize();
    if (!this.db || !this.enabled || !runId) return;

    try {
      const insert = this.db.prepare(`
        INSERT INTO results (run_id, test_name, file, status, duration_ms, error_type, error_message, error_hash, stack_trace)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((tests) => {
        for (const test of tests) {
          const errorHash = test.e ? this.hashError(test.e) : null;
          const stackTrace = test.stk ? JSON.stringify(test.stk) : null;

          insert.run(
            runId,
            test.t,
            test.f?.split(':')[0] || 'unknown',
            test.e ? 'fail' : 'pass',
            test.d || 0,
            test.e?.type || null,
            test.e?.msg || null,
            errorHash,
            stackTrace
          );
        }
      });

      insertMany(tests);
    } catch (error) {
      console.warn(`PersistentIndex: Failed to record test results: ${error.message}`);
    }
  }

  /**
   * Create stable hash from error pattern
   * @param {Object} error - Error object
   * @returns {string} MD5 hash
   */
  hashError(error) {
    if (!error || !error.msg) return null;

    // Normalize error message to detect similar errors
    const normalized = error.msg
      .replace(/:\d+:\d+/g, ':X:X')      // Remove line:col
      .replace(/\d+/g, 'N')              // Replace numbers
      .replace(/'[^']*'/g, 'STR')        // Replace string literals
      .replace(/"[^"]*"/g, 'STR')        // Replace double-quoted strings
      .replace(/`[^`]*`/g, 'STR');       // Replace backtick strings

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Get git information
   * @returns {Object} Git info
   */
  getGitInfo() {
    if (!this.trackGit) {
      return { hash: null, branch: null };
    }

    try {
      const hash = execSync('git rev-parse --short HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();

      return { hash, branch };
    } catch (error) {
      return { hash: null, branch: null };
    }
  }

  /**
   * Get test history
   * @param {string} testName - Test name
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Test history
   */
  async getTestHistory(testName, limit = 10) {
    await this.initialize();
    if (!this.db || !this.enabled) return [];

    try {
      const query = this.db.prepare(`
        SELECT r.*, runs.timestamp, runs.git_hash, runs.git_branch
        FROM results r
        JOIN runs ON r.run_id = runs.id
        WHERE r.test_name = ?
        ORDER BY runs.timestamp DESC
        LIMIT ?
      `);

      return query.all(testName, limit);
    } catch (error) {
      console.warn(`PersistentIndex: Query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Find tests with similar failures
   * @param {string} errorHash - Error hash
   * @returns {Promise<Array>} Similar failures
   */
  async findSimilarFailures(errorHash) {
    await this.initialize();
    if (!this.db || !this.enabled || !errorHash) return [];

    try {
      const query = this.db.prepare(`
        SELECT test_name, file, COUNT(*) as occurrences
        FROM results
        WHERE error_hash = ? AND status = 'fail'
        GROUP BY test_name, file
        ORDER BY occurrences DESC
        LIMIT 10
      `);

      return query.all(errorHash);
    } catch (error) {
      console.warn(`PersistentIndex: Query failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate test flakiness
   * @param {string} testName - Test name
   * @param {number} windowDays - Time window in days
   * @returns {Promise<Object|null>} Flakiness stats
   */
  async getFlakiness(testName, windowDays = 7) {
    await this.initialize();
    if (!this.db || !this.enabled) return null;

    try {
      const query = this.db.prepare(`
        SELECT
          COUNT(*) as total_runs,
          SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passes,
          SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failures
        FROM results r
        JOIN runs ON r.run_id = runs.id
        WHERE r.test_name = ?
          AND runs.timestamp > datetime('now', '-' || ? || ' days')
      `);

      const stats = query.get(testName, windowDays);

      if (!stats || stats.total_runs === 0) return null;

      return {
        passRate: ((stats.passes / stats.total_runs) * 100).toFixed(1),
        isFlaky: stats.passes > 0 && stats.failures > 0,
        totalRuns: stats.total_runs,
        passes: stats.passes,
        failures: stats.failures
      };
    } catch (error) {
      console.warn(`PersistentIndex: Query failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Cleanup old data
   */
  cleanup() {
    if (!this.db || !this.enabled || !this.retentionDays) return;

    try {
      this.db.prepare(`
        DELETE FROM results
        WHERE run_id IN (
          SELECT id FROM runs
          WHERE timestamp < datetime('now', '-' || ? || ' days')
        )
      `).run(this.retentionDays);

      this.db.prepare(`
        DELETE FROM runs
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `).run(this.retentionDays);
    } catch (error) {
      console.warn(`PersistentIndex: Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch (error) {
        // Ignore close errors
      }
    }
  }
}

export default PersistentIndex;
