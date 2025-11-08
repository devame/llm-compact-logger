# LLM Compact Logger - Complete Reference

This file contains detailed format specifications, all error patterns, and complete configuration options for llm-compact-logger. Claude accesses this only when needed for detailed lookups.

## Complete Format Specification

### Core Abbreviated Keys

| Key | Full Name | Type | Example |
|-----|-----------|------|---------|
| `t` | Test name | string | `"should validate email"` |
| `f` | File:line location | string | `"auth.test.js:42"` |
| `e` | Error object | object | `{type, msg, E, R}` |
| `E` | Expected value | any | `"valid@email.com"` |
| `R` | Received/actual value | any | `"invalid"` |
| `sum` | Summary statistics | object | `{tot, pas, fai, rate}` |
| `tot` | Total tests | number | `10` |
| `pas` | Passed tests | number | `7` |
| `fai` | Failed tests | number | `3` |
| `d` | Duration (ms) | number | `125` |

### Enhancement Fields

When enhancements are enabled (v0.2.0+):

**code** - Inline code context:
```json
{
  "fail": "expect(result).toBe(5)",
  "ctx": [
    "const result = calculate();",
    "expect(result).toBe(5);"
  ],
  "line": {
    "start": 26,
    "failing": 28,
    "end": 31
  }
}
```

**stk** - Enhanced stack trace (array of frames):
```json
[
  {
    "fn": "expect",
    "at": "test.js:28",
    "code": "expect(result).toBe(5)",
    "test": true
  },
  {
    "fn": "calculate",
    "at": "index.js:76",
    "code": "return x + y",
    "test": false
  }
]
```

**e.hint** - Smart diff hint:
```json
"Type mismatch: got array but expected object"
```

**e.actual / e.expected** - Structured diff:
```json
{
  "actual": "[2 items]: [{...}]",
  "expected": "{value: {...}}",
  "diff": {
    "type": "array",
    "lengthDiff": 2
  }
}
```

**history** - Test execution history:
```json
{
  "lastPassed": "2025-01-07T10:23:45Z",
  "failCount": 3,
  "totalRuns": 5,
  "flaky": {
    "passRate": "40.0",
    "isFlaky": true,
    "totalRuns": 5,
    "passes": 2,
    "failures": 3
  }
}
```

**links** - IDE navigation links:
```json
{
  "test": {
    "label": "test.js",
    "vscode": "vscode://file/.../test.js:28",
    "idea": "idea://open?file=...&line=28",
    "file": "file://.../test.js:28"
  },
  "source": {
    "label": "index.js",
    "vscode": "vscode://file/.../index.js:76"
  },
  "lastChange": "abc123f 2 days ago Fix parser"
}
```

**coverage** - Function execution:
```json
{
  "functions": [
    {"name": "parse", "file": "index.js", "line": 76, "count": 3}
  ],
  "executionPath": [
    {"fn": "parse", "file": "index.js:76", "fromStack": true, "calls": 3}
  ],
  "totalFunctions": 5
}
```

## All Error Patterns

### Pattern Catalog

**1. Undefined Property Access**
- Pattern: `Cannot read properties of undefined (reading 'X')`
- Confidence: 0.95
- Fix: Add null check before accessing property
- Example: `if (obj?.property)` or verify object structure

**2. Null Property Access**
- Pattern: `Cannot read properties of null (reading 'X')`
- Confidence: 0.95
- Fix: Add null check or verify why object is null
- Example: Check initialization, API responses

**3. Type Mismatch**
- Pattern: `expected X to be/equal Y`
- Confidence: 0.75
- Fix: Verify API return type matches expectations
- Example: API changed from object to array

**4. Array Length Mismatch**
- Pattern: `expected array to have length X but got Y`
- Confidence: 0.90
- Fix: Check if data changed, items filtered, or test outdated
- Example: API now returns filtered results

**5. Assertion Error**
- Pattern: `AssertionError`
- Confidence: 0.60
- Fix: Review expectations vs actual behavior
- Example: Values or behavior changed

**6. Timeout**
- Pattern: `timeout` or `timed out`
- Confidence: 0.85
- Fix: Check async operations, missing awaits, infinite loops
- Example: Add `await`, check performance

**7. Not a Function**
- Pattern: `X is not a function`
- Confidence: 0.95
- Fix: Check for typos, missing imports, incorrect destructuring
- Example: Verify import paths and exports

**8. Undefined Reference**
- Pattern: `X is not defined`
- Confidence: 0.95
- Fix: Check imports, typos, or scope issues
- Example: Add missing import statement

## Complete Configuration Reference

### Enhancement Options

**1. codeContext** (enabled by default)
```javascript
codeContext: {
  contextLines: 3  // Lines before/after failure (default: 3)
}
```

**2. diff** (enabled by default)
```javascript
diff: {
  maxDepth: 3,        // Object nesting depth (default: 3)
  maxArrayItems: 5,   // Array items to show (default: 5)
  maxObjectKeys: 5    // Object keys to show (default: 5)
}
```

**3. stack** (enabled by default)
```javascript
stack: {
  maxFrames: 5,       // Stack frames to include (default: 5)
  maxCodeLength: 80   // Code truncation length (default: 80)
}
```

**4. rootCause** (enabled by default)
```javascript
rootCause: {
  minGroupSize: 2,    // Min failures to form pattern (default: 2)
  maxSuggestions: 5   // Max suggestions to show (default: 5)
}
```

**5. coverage** (enabled by default)
```javascript
coverage: {
  useCoverage: true,       // Enable/disable (default: true)
  coverageDir: '.coverage', // Coverage output dir (default: .coverage)
  maxFunctions: 10         // Functions to show (default: 10)
}
```

Requires Vitest coverage configuration:
```javascript
test: {
  coverage: {
    enabled: true,
    provider: 'v8',
    reporter: ['json'],
    reportsDirectory: '.coverage'
  }
}
```

**6. links** (enabled by default)
```javascript
links: {
  trackGit: true,        // Git blame integration (default: true)
  maxRelatedTests: 3     // Related tests to show (default: 3)
}
```

**7. persistentIndex** (disabled by default)
```javascript
persistentIndex: {
  enabled: true,           // Enable/disable (default: false)
  path: '.test-index',     // DB location (default: .test-index)
  retentionDays: 30,       // History retention (default: 30)
  trackGit: true           // Git integration (default: true)
}
```

Requires: `npm install --save-optional better-sqlite3`

### Complete Configuration Examples

**Disable All Enhancements:**
```javascript
new VitestReporter({
  outputDir: './debug',
  enhancements: {
    codeContext: false,
    diff: false,
    stack: false,
    rootCause: false,
    coverage: false,
    links: false,
    persistentIndex: { enabled: false }
  }
})
```

**Custom Configuration:**
```javascript
new VitestReporter({
  outputDir: './debug',
  enhancements: {
    codeContext: { contextLines: 5 },
    diff: { maxDepth: 5, maxArrayItems: 10 },
    stack: { maxFrames: 10, maxCodeLength: 120 },
    rootCause: { minGroupSize: 3 },
    coverage: false,  // Disabled
    links: { trackGit: false },
    persistentIndex: {
      enabled: true,
      retentionDays: 60,
      trackGit: true
    }
  }
})
```

## Troubleshooting Guide

### Enhancement Loading Issues

**Error: "ReferenceError: InlineCodeContextEnhancer is not defined"**
- Cause: Using version < 0.2.1 with Vitest
- Fix: Update to v0.2.1+
- Workaround: Disable all enhancements

**Error: "require is not defined in ES module scope"**
- Cause: Using version < 0.2.2 with better-sqlite3 in ESM
- Fix: Update to v0.2.2+
- Workaround: Disable `persistentIndex`

**Error: "NOT NULL constraint failed: results.test_name"**
- Cause: Using version < 0.2.3
- Fix: Update to v0.2.3+

### Database Issues

**Warning: "better-sqlite3 not installed"**
- Cause: `persistentIndex` enabled without package
- Fix: `npm install --save-optional better-sqlite3`
- Or: Set `persistentIndex: { enabled: false }`

**Database locks or corruption**
- Cause: Multiple processes accessing same DB
- Fix: Use separate output directories per test process
- Or: Disable persistent index in parallel test scenarios

### Coverage Issues

**Warning: "Coverage file not found"**
- Cause: `coverage` enhancement enabled without Vitest coverage
- Fix: Enable coverage in vitest.config.js
- Or: Set `coverage: false`

**Coverage shows no functions**
- Cause: Coverage reporter not set to 'json'
- Fix: Add `reporter: ['json']` to coverage config

### Missing Enhancement Output

**No `code`, `stk`, `e.hint` fields in output**
- Cause: Using version < 0.2.0 or enhancements disabled
- Fix: Update to v0.2.0+ and verify configuration
- Check: Console should show "Failed to load some enhancements" if error

## Version History

- **0.2.3**: Fixed database constraint violations
- **0.2.2**: Fixed ESM compatibility for better-sqlite3
- **0.2.1**: Fixed enhancement loading in Vitest
- **0.2.0**: Added 7 enhancement features
- **0.1.0**: Initial release with basic compact logging
