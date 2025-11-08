---
name: llm-compact-logger-analysis
description: Analyze llm-compact-logger test output and configure enhancements. Use when user shares debug-compact.json, debug-report.json, or asks about test failures.
version: 1.0.0
---

# LLM Compact Logger Analysis

## Overview

This Skill helps analyze token-efficient test reports from llm-compact-logger and configure its 7 enhancement features. Claude should use this Skill whenever the user shares files ending in `debug-compact.json` or `debug-report.json`, mentions llm-compact-logger configuration, or needs help interpreting compact test failure output.

## Key Format: Abbreviated JSON

llm-compact-logger uses abbreviated keys to reduce token consumption by ~85%:

| Key | Meaning | Example |
|-----|---------|---------|
| `t` | Test name | `"should validate email"` |
| `f` | File:line | `"auth.test.js:42"` |
| `e` | Error details | Object with type, msg, E, R |
| `E` | Expected value | `"valid@email.com"` |
| `R` | Received/actual | `"invalid"` |

**Enhanced Format Fields** (when enhancements enabled):

- `code` - Failing line with 3-line context
- `stk` - Array of stack frames with function names + source code
- `e.hint` - Smart diff explanation (e.g., "Type mismatch: got array but expected object")
- `history` - Past runs, flakiness data
- `links` - VSCode/IDEA clickable links
- `coverage` - Functions executed during test

## Analyzing Reports

### Step 1: Check for Root Causes

Look for `meta.rootCauses` array first. If present, lead with this:

```json
{
  "meta": {
    "rootCauses": [
      {
        "pattern": "Accessing property 'name' on undefined",
        "confidence": 0.95,
        "affectedTests": ["test1", "test2"],
        "suggestion": "Check if object exists before accessing"
      }
    ]
  }
}
```

High confidence (>0.85) = actionable pattern found.

### Step 2: Review Error Patterns

Group by `topFails`:

```json
{
  "topFails": [
    {"type": "TypeError", "count": 5},
    {"type": "AssertionError", "count": 3}
  ]
}
```

**Common patterns and fixes:**

- **TypeError: Cannot read properties of undefined** → Add null checks
- **Type mismatch (array vs object)** → API changed, check structure
- **Array length mismatch** → Data changed or filtering issue

### Step 3: Show Code Context

If `code` field exists:

```json
{
  "code": {
    "fail": "expect(result).toBe(5)",
    "ctx": ["const result = calculate();", "expect(result).toBe(5);"],
    "line": {"failing": 28}
  }
}
```

Display the failing line with surrounding context.

### Step 4: Check Flakiness

If `history.flaky` exists:

```json
{
  "history": {
    "flaky": {"passRate": "40.0", "isFlaky": true},
    "failCount": 3,
    "totalRuns": 5
  }
}
```

Flag as flaky and recommend investigation.

## Configuring Enhancements

Ask these questions to determine configuration:

**1. Need test history?**
→ Enable `persistentIndex` (requires `npm install better-sqlite3`)

**2. Already using coverage?**
→ Enable `coverage` + configure Vitest coverage

**3. Using VSCode/IntelliJ?**
→ Keep `links: true` (default)

**4. Have flaky tests?**
→ Strongly recommend `persistentIndex`

### Configuration Templates

**Minimal (zero extra dependencies):**
```javascript
new VitestReporter({ outputDir: './debug' })
// All enhancements enabled by default except persistentIndex
```

**Recommended (with coverage):**
```javascript
export default {
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['json'],
      reportsDirectory: '.coverage'
    },
    reporters: [
      'default',
      new VitestReporter({ outputDir: './debug' })
    ]
  }
}
```

**Full (all features):**
```javascript
new VitestReporter({
  outputDir: './debug',
  enhancements: {
    codeContext: true,
    diff: true,
    stack: true,
    rootCause: true,
    coverage: true,
    links: true,
    persistentIndex: { enabled: true, retentionDays: 30 }
  }
})
```

## Response Format

Structure analysis as:

```
📊 Summary: X tests (X passed, X failed) - X% pass rate

🎯 Root Cause:
[Pattern]: [Description] (X% confidence)
Suggestion: [Fix]

❌ Key Failures:
1. [Test] (file:line)
   Error: [Type] - [Message]
   Issue: [Explanation]
   Fix: [Solution]

💡 Next Steps:
- [Actionable items]
```

## When to Apply

Use this Skill when:
- User shares `debug-compact.json` or `debug-report.json` files
- User asks to analyze test failures or debug output
- User mentions configuring llm-compact-logger
- User references Vitest reporter configuration
- User asks about test flakiness or failure patterns

## Troubleshooting

**"better-sqlite3 not installed"**
Fix: `npm install --save-optional better-sqlite3`
Or: `persistentIndex: { enabled: false }`

**"Coverage file not found"**
Fix: Enable coverage in vitest.config.js
Or: `coverage: false`

**No enhancements in output**
Check: Look for `code`, `stk` array, `e.hint` fields
Fix: Update to v0.2.0+ or verify config
