/**
 * Enhancement 5: Smart Root Cause Analysis
 *
 * Analyzes failure patterns to identify root causes and provide suggestions.
 * Zero coupling - purely analyzes error data already available.
 *
 * Difficulty: 🟡 Medium
 * ROI: High
 */

export class RootCauseAnalyzer {
  constructor(options = {}) {
    this.minGroupSize = options.minGroupSize || 2;
    this.maxSuggestions = options.maxSuggestions || 5;
  }

  /**
   * Analyze all failures and identify root causes
   * @param {Array} failures - Array of failures
   * @returns {Array} Root cause analysis results
   */
  analyze(failures) {
    if (!failures || failures.length === 0) {
      return [];
    }

    // Group failures by error pattern
    const groups = this.groupByPattern(failures);

    // Analyze each group for root causes
    const rootCauses = groups
      .map(group => ({
        pattern: group.pattern,
        confidence: group.confidence,
        affectedTests: group.failures.map(f => f.t),
        count: group.failures.length,
        suspectedFiles: this.findCommonSourceFiles(group.failures),
        suggestion: group.suggestion,
        evidence: group.evidence
      }))
      .sort((a, b) => b.confidence - a.confidence);

    return rootCauses;
  }

  /**
   * Group failures by error pattern
   * @param {Array} failures - Array of failures
   * @returns {Array} Grouped failures
   */
  groupByPattern(failures) {
    const patterns = this.getPatternMatchers();
    const groups = [];
    const matched = new Set();

    // Try each pattern
    for (const pattern of patterns) {
      const matches = failures
        .filter(f => !matched.has(f))
        .map(f => ({
          failure: f,
          match: f.e?.msg ? f.e.msg.match(pattern.regex) : null
        }))
        .filter(r => r.match);

      if (matches.length >= this.minGroupSize) {
        const group = pattern.analyze(matches);
        group.failures = matches.map(m => m.failure);
        group.confidence = pattern.confidence;
        groups.push(group);

        // Mark as matched
        matches.forEach(m => matched.add(m.failure));
      }
    }

    // Handle ungrouped failures
    const ungrouped = failures.filter(f => !matched.has(f));
    if (ungrouped.length > 0) {
      groups.push({
        pattern: 'Various unrelated errors',
        confidence: 0.3,
        failures: ungrouped,
        suggestion: 'Review each failure individually',
        evidence: `${ungrouped.length} test(s) with different error patterns`
      });
    }

    return groups;
  }

  /**
   * Get pattern matchers for common error types
   * @returns {Array} Pattern matcher configurations
   */
  getPatternMatchers() {
    return [
      {
        name: 'undefined_property_access',
        regex: /Cannot read propert(?:y|ies) of undefined \(reading '(\w+)'\)/,
        confidence: 0.95,
        analyze: (matches) => {
          const property = matches[0].match[1];
          return {
            pattern: `Accessing property '${property}' on undefined object`,
            evidence: `All ${matches.length} test(s) fail when accessing '.${property}'`,
            suggestion: `Check if parent object exists before accessing '.${property}', or verify the object structure returned by your code`
          };
        }
      },
      {
        name: 'null_property_access',
        regex: /Cannot read propert(?:y|ies) of null \(reading '(\w+)'\)/,
        confidence: 0.95,
        analyze: (matches) => {
          const property = matches[0].match[1];
          return {
            pattern: `Accessing property '${property}' on null object`,
            evidence: `All ${matches.length} test(s) fail when accessing '.${property}' on null`,
            suggestion: `Add null check before accessing '.${property}', or verify why the object is null`
          };
        }
      },
      {
        name: 'type_mismatch',
        regex: /expected .+ to (?:be|equal) .+/i,
        confidence: 0.75,
        analyze: (matches) => ({
          pattern: 'Type or value mismatch in assertions',
          evidence: `${matches.length} test(s) have unexpected return values or types`,
          suggestion: 'API or function may have changed - verify return types and values match test expectations'
        })
      },
      {
        name: 'array_length',
        regex: /expected .+ to have a length of (\d+) but got (\d+)/i,
        confidence: 0.90,
        analyze: (matches) => {
          const first = matches[0].match;
          return {
            pattern: `Array length mismatch (expected ${first[1]}, got ${first[2]})`,
            evidence: `${matches.length} test(s) have arrays with unexpected lengths`,
            suggestion: 'Data structure may have changed - check if items are being added, removed, or filtered unexpectedly'
          };
        }
      },
      {
        name: 'assertion_error',
        regex: /AssertionError/i,
        confidence: 0.60,
        analyze: (matches) => ({
          pattern: 'General assertion failures',
          evidence: `${matches.length} test(s) failed assertions`,
          suggestion: 'Review test expectations and actual behavior - values or behavior may have changed'
        })
      },
      {
        name: 'timeout',
        regex: /(?:timeout|timed out)/i,
        confidence: 0.85,
        analyze: (matches) => ({
          pattern: 'Test timeout errors',
          evidence: `${matches.length} test(s) exceeded time limit`,
          suggestion: 'Async operations may not be completing - check for missing awaits, infinite loops, or performance issues'
        })
      },
      {
        name: 'not_a_function',
        regex: /(.+) is not a function/,
        confidence: 0.95,
        analyze: (matches) => {
          const target = matches[0].match[1];
          return {
            pattern: `'${target}' is not a function`,
            evidence: `${matches.length} test(s) trying to call a non-function`,
            suggestion: 'Check for typos, missing imports, or incorrect object destructuring'
          };
        }
      },
      {
        name: 'undefined_reference',
        regex: /(.+) is not defined/,
        confidence: 0.95,
        analyze: (matches) => {
          const name = matches[0].match[1];
          return {
            pattern: `'${name}' is not defined`,
            evidence: `${matches.length} test(s) reference undefined variable`,
            suggestion: 'Check for missing imports, typos in variable names, or scope issues'
          };
        }
      }
    ];
  }

  /**
   * Find common source files across failures
   * @param {Array} failures - Array of failures
   * @returns {Array} Common source files
   */
  findCommonSourceFiles(failures) {
    if (!failures || failures.length === 0) return [];

    // Extract source files from stack traces
    const sourceFilesPerTest = failures.map(f => {
      if (!f.stk) return [];

      // If stk is an array (enhanced), extract files
      if (Array.isArray(f.stk)) {
        return f.stk
          .filter(frame => !frame.test) // Exclude test files
          .map(frame => {
            const match = frame.at.match(/(.+):\d+/);
            return match ? match[1] : null;
          })
          .filter(Boolean);
      }

      // If stk is a string, try to extract file
      return [];
    });

    // Count file occurrences
    const fileCounts = {};
    for (const files of sourceFilesPerTest) {
      const uniqueFiles = [...new Set(files)]; // Unique per test
      for (const file of uniqueFiles) {
        fileCounts[file] = (fileCounts[file] || 0) + 1;
      }
    }

    // Return files that appear in multiple failures
    return Object.entries(fileCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([file, count]) => ({
        file,
        count,
        percentage: Math.round((count / failures.length) * 100)
      }));
  }

  /**
   * Get a summary of the root cause analysis
   * @param {Array} rootCauses - Root cause analysis results
   * @returns {Object} Summary object
   */
  getSummary(rootCauses) {
    if (!rootCauses || rootCauses.length === 0) {
      return null;
    }

    const topCause = rootCauses[0];

    return {
      totalPatterns: rootCauses.length,
      topPattern: topCause.pattern,
      topConfidence: topCause.confidence,
      topAffectedCount: topCause.count,
      topSuggestion: topCause.suggestion
    };
  }
}

export default RootCauseAnalyzer;
