---
name: analyzing-llm-compact-logger
description: Analyzes and configures llm-compact-logger test output. Use when user shares debug-compact.json or debug-report.json files, asks about test failures, mentions llm-compact-logger configuration, or needs help interpreting compact test results from Vitest or Jest.
---

# LLM Compact Logger Analysis

## Overview

llm-compact-logger produces token-efficient JSON test reports with abbreviated keys. This Skill helps interpret the compact format and configure the 7 enhancement features.

## When to Apply

- User shares files ending in `debug-compact.json` or `debug-report.json`
- User asks to analyze test failures or debug output
- User mentions configuring llm-compact-logger or enabling enhancements
- User references Vitest/Jest reporter configuration

## Key Abbreviations

The compact format uses these abbreviations:

| Key | Meaning | Type |
|-----|---------|------|
| `t` | Test name | string |
| `f` | File:line location | string |
| `e` | Error object | object |
| `E` | Expected value | any |
| `R` | Received/actual value | any |
| `stk` | Stack trace | string or array |
| `code` | Inline code context | object |
| `sum` | Summary statistics | object |
| `tot` | Total tests | number |
| `pas` | Passed tests | number |
| `fai` | Failed tests | number |

## Enhancement Fields

When enhancements are enabled, failures include additional fields:

**code**: Inline context with failing line
```javascript
{
  "fail": "expect(result).toBe(5)",
  "ctx": ["const result = calculate();", "expect(result).toBe(5);"],
  "line": { "start": 26, "failing": 28, "end": 31 }
}
```

**stk**: Enhanced stack with function names and source code
```javascript
[
  { "fn": "expect", "at": "test.js:28", "code": "expect(...)", "test": true },
  { "fn": "calculate", "at": "index.js:76", "code": "return x + y", "test": false }
]
```

**e.hint**: Smart diff hint explaining mismatch
```javascript
{
  "actual": "[2 items]",
  "expected": "{value: {...}}",
  "hint": "Type mismatch: got array but expected object"
}
```

**history**: Test execution history from persistent index
```javascript
{
  "lastPassed": "2025-01-07T10:23:45Z",
  "failCount": 3,
  "totalRuns": 5,
  "flaky": { "passRate": "40.0", "isFlaky": true }
}
```

**links**: IDE-compatible navigation links
```javascript
{
  "test": { "label": "test.js", "vscode": "vscode://file/...:28" },
  "source": { "label": "index.js", "vscode": "vscode://file/...:76" }
}
```

**coverage**: Functions executed during test
```javascript
{
  "functions": [{ "name": "parse", "file": "index.js", "line": 76 }],
  "executionPath": [{ "fn": "parse", "file": "index.js:76" }]
}
```

## Analyzing Debug Reports

### 1. Check Root Causes First

Look for `meta.rootCauses` array (added by root cause analyzer):

```javascript
{
  "meta": {
    "rootCauses": [
      {
        "pattern": "Accessing property 'name' on undefined",
        "confidence": 0.95,
        "affectedTests": ["test1", "test2"],
        "count": 2,
        "suggestion": "Check if object exists before accessing property"
      }
    ]
  }
}
```

If present, lead with this analysis. High confidence (>0.85) patterns are actionable.

### 2. Examine Error Patterns

Group failures by `e.type` using `topFails`:

```javascript
{
  "topFails": [
    { "type": "TypeError", "count": 5 },
    { "type": "AssertionError", "count": 3 }
  ]
}
```

Common patterns and fixes:

**TypeError: Cannot read properties of undefined**
- Check for null/undefined before property access
- Verify object structure matches expectations
- Look at `e.hint` for specific guidance

**Type mismatch (array vs object)**
- API may have changed return type
- Check if accessing wrong property path
- Review `e.actual` vs `e.expected` structure

**Array length mismatch**
- Data may have changed
- Items being filtered unexpectedly
- Test expectations may be outdated

### 3. Review Code Context

If `code` field exists, show the failing line with context:

```
Line 28: expect(result).toBe(5)
Context:
  const result = calculate();
  expect(result).toBe(5);
```

### 4. Check Test History

If `history` exists, identify flaky tests:

```
Test has failed 3 of 5 runs (40% pass rate)
Last passed: 2025-01-07
Status: Flaky - investigate intermittent issues
```

## Configuration Guidance

### Default Configuration (Recommended)

All enhancements enabled except persistent index:

```javascript
import { VitestReporter } from 'llm-compact-logger/adapters/vitest';

export default {
  test: {
    reporters: [
      'default',
      new VitestReporter({ outputDir: './debug' })
    ]
  }
};
```

### Enhancement Decision Tree

Ask these questions to determine which enhancements to enable:

**Need test history tracking?**
→ Enable `persistentIndex` (requires `npm install better-sqlite3`)

**Already using coverage?**
→ Set `coverage.useCoverage: true` and configure Vitest coverage:
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

**Using VSCode/IntelliJ?**
→ Keep `links: true` (enabled by default)

**Have flaky tests?**
→ Enable `persistentIndex` for flakiness detection

### Selective Configuration

To disable specific enhancements:

```javascript
new VitestReporter({
  outputDir: './debug',
  enhancements: {
    codeContext: true,   // Keep
    diff: true,          // Keep
    stack: true,         // Keep
    rootCause: true,     // Keep
    coverage: false,     // Disable
    links: true,         // Keep
    persistentIndex: { enabled: false }  // Disable
  }
})
```

### Full Configuration

All features enabled:

```javascript
new VitestReporter({
  outputDir: './debug',
  enhancements: {
    codeContext: { contextLines: 3 },
    diff: { maxDepth: 3, maxArrayItems: 5, maxObjectKeys: 5 },
    stack: { maxFrames: 5, maxCodeLength: 80 },
    rootCause: { minGroupSize: 2 },
    coverage: { useCoverage: true, coverageDir: '.coverage' },
    links: { trackGit: true },
    persistentIndex: { enabled: true, retentionDays: 30 }
  }
})
```

## Troubleshooting

### "better-sqlite3 not installed"
User enabled `persistentIndex` without the package.

Fix: `npm install --save-optional better-sqlite3`
Or: Disable with `persistentIndex: { enabled: false }`

### "Coverage file not found"
User enabled `coverage` enhancement but no coverage data exists.

Fix: Enable Vitest coverage in config (see above)
Or: Disable with `coverage: false`

### No enhancements in output
Enhancements may be disabled or old version (pre-0.2.0).

Check: Look for `code`, `stk` array, `e.hint` fields in output
Fix: Update to version 0.2.0+ or verify configuration

## Output Format Examples

### Minimal failure (no enhancements):
```json
{
  "t": "should validate email",
  "f": "auth.test.js:42",
  "e": {
    "type": "AssertionError",
    "msg": "expected 'invalid' to be valid email",
    "E": "valid email",
    "R": "invalid"
  }
}
```

### Enhanced failure (all features):
```json
{
  "t": "should validate email",
  "f": "auth.test.js:42",
  "code": {
    "fail": "expect(validate(email)).toBe(true)",
    "ctx": [
      "const email = 'invalid';",
      "expect(validate(email)).toBe(true);"
    ],
    "line": { "failing": 42 }
  },
  "e": {
    "type": "AssertionError",
    "msg": "expected false to be true",
    "actual": false,
    "expected": true,
    "hint": "Type mismatch: boolean values differ"
  },
  "stk": [
    { "fn": "expect", "at": "auth.test.js:42", "test": true }
  ],
  "links": {
    "test": { "vscode": "vscode://file/.../auth.test.js:42" }
  }
}
```

## Response Template

When analyzing debug reports, structure responses as:

```
📊 Summary: X tests (X passed, X failed) - X% pass rate

🎯 Root Cause:
[Pattern]: [Description] (X% confidence)
Suggestion: [Actionable fix]

❌ Key Failures:

1. [Test name] (file:line)
   Error: [Type] - [Message]
   Issue: [Explanation]
   Fix: [Solution]

[Repeat for top 3-5 failures]

💡 Next Steps:
- [Specific action items based on analysis]
```

Focus on actionable insights. Use `e.hint`, root cause patterns, and code context to provide specific fixes rather than generic advice.
