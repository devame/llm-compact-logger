# LLM Compact Logger

**Generic token-efficient logger for LLM-assisted debugging**

Reduces debug output token consumption by ~85-90% while maintaining full context for AI analysis.

## Features

- 🎯 **Framework-agnostic**: Works with any test framework or standalone
- 📦 **Adapters included**: Vitest, Jest (more coming soon)
- 🔧 **Extensible**: Easy to create custom adapters
- 💾 **Dual output**: Full report with legend + ultra-compact version
- 📊 **Smart analysis**: Groups failures, identifies patterns
- 🚀 **Token-optimized**: Abbreviated keys, minimal formatting
- 🔍 **jq-friendly**: Query and analyze with standard tools

## Installation

```bash
npm install llm-compact-logger
# or
yarn add llm-compact-logger
# or
pnpm add llm-compact-logger
```

## Quick Start

### With Vitest

```javascript
// vitest.config.js
import { VitestReporter } from 'llm-compact-logger';

export default {
  test: {
    reporters: [
      'default',
      new VitestReporter({
        outputDir: './debug'
      })
    ]
  }
};
```

### With Jest

```javascript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    ['llm-compact-logger/adapters/jest', {
      outputDir: './debug'
    }]
  ]
};
```

### Standalone (Custom Logging)

```javascript
import { CompactLogger } from 'llm-compact-logger';

const logger = new CompactLogger({ outputDir: './debug' });

logger.logFailure({
  name: 'API validation failed',
  location: { file: 'api.js', line: 42 },
  error: {
    type: 'ValidationError',
    message: 'Invalid email format',
    expected: 'user@example.com',
    actual: 'invalid-email'
  }
});

await logger.finalize();
```

## Output Format

### Compact Format (850 tokens for 17 failures)

```json
{
  "sum": {"tot": 43, "pas": 26, "fai": 17, "rate": 60},
  "fails": [
    {
      "t": "should validate email",
      "f": "auth.test.js:42",
      "e": {
        "type": "AssertionError",
        "msg": "expected 'invalid' to be valid email",
        "E": "valid email",
        "R": "invalid"
      },
      "stk": "42:15"
    }
  ],
  "topFails": [
    {"type": "AssertionError", "count": 7}
  ]
}
```

### Full Format (1106 tokens for 17 failures)

Includes:
- Metadata (timestamp, duration, git commit)
- Summary statistics
- All failures with details
- Failures grouped by file
- Top error types
- Legend explaining abbreviations

## Key Abbreviations

| Key | Meaning |
|-----|---------|
| `t` | Test/check name |
| `f` | File:line location |
| `e` | Error object |
| `E` | Expected value |
| `R` | Received/actual value |
| `stk` | Stack trace (line:col) |
| `ctx` | Additional context |
| `tot` | Total tests |
| `pas` | Passed |
| `fai` | Failed |

## Token Savings Comparison

**Traditional verbose output:**
```
FAIL  test.js > should validate email
AssertionError: expected 'invalid' to be valid email

- Expected
+ Received

- valid email
+ invalid

 ❯ test.js:42:15
```
**~120 tokens**

**Compact format:**
```json
{"t":"should validate email","f":"test.js:42","e":{"type":"AssertionError","msg":"expected 'invalid' to be valid email","E":"valid email","R":"invalid"},"stk":"42:15"}
```
**~60 tokens** (50% savings)

**With grouping, deduplication, and summary:** ~85% overall savings

## API Reference

### CompactLogger

```javascript
const logger = new CompactLogger(options);
```

**Options:**
- `outputDir` (string): Output directory (default: '.')
- `compactFilename` (string): Compact file name (default: 'debug-compact.json')
- `fullFilename` (string): Full report file name (default: 'debug-report.json')
- `metadata` (object): Custom metadata to include
- `maxMessageLength` (number): Max error message length (default: 200)

**Methods:**

```javascript
// Log a failure
logger.logFailure({
  name: string,
  location: { file: string, line?: number },
  error: {
    type: string,
    message: string,
    expected?: any,
    actual?: any,
    stack?: string
  },
  context?: object
});

// Log a success
logger.logPass({
  name: string,
  location: { file: string, line?: number },
  duration?: number
});

// Finalize and write reports
const result = await logger.finalize();
// Returns: { fullPath, compactPath, fullTokens, compactTokens, failures, passes }
```

### Creating Custom Adapters

```javascript
import { BaseAdapter } from 'llm-compact-logger';

class MyFrameworkAdapter extends BaseAdapter {
  convertFailure(frameworkFailure) {
    return {
      name: frameworkFailure.testName,
      location: {
        file: frameworkFailure.file,
        line: frameworkFailure.line
      },
      error: {
        type: frameworkFailure.errorType,
        message: frameworkFailure.message,
        expected: frameworkFailure.expected,
        actual: frameworkFailure.actual
      }
    };
  }

  convertPass(frameworkPass) {
    // ... similar conversion
  }

  extractSummary(results) {
    return {
      tot: results.total,
      pas: results.passed,
      fai: results.failed,
      rate: Math.round((results.passed / results.total) * 100)
    };
  }
}
```

## Querying Reports with jq

```bash
# Get summary
jq '.sum' debug-compact.json

# List all failing test names
jq '.fails[].t' debug-compact.json

# Get failures from specific file
jq '.fails[] | select(.f | startswith("auth.test.js"))' debug-compact.json

# Count by error type
jq '.topFails' debug-compact.json

# Export to CSV
jq -r '.fails[] | [.t, .f, .e.type, .e.msg] | @csv' debug-report.json
```

## Use Cases

### 1. Test Framework Integration
Replace verbose test output with token-efficient JSON for LLM debugging.

### 2. Runtime Error Logging
Log production errors in a format optimized for AI analysis.

### 3. CI/CD Pipeline Debugging
Reduce log size in GitHub Actions, GitLab CI while maintaining debuggability.

### 4. Monitoring & Alerting
Send compact failure reports to your monitoring system.

### 5. Historical Analysis
Store test results in SQLite/database for trend analysis (see examples/).

## Examples

See the `examples/` directory for:
- `standalone-usage.js` - Custom logging without frameworks
- `vitest-usage.js` - Vitest configuration
- `custom-adapter.js` - Creating your own adapter

## Enhancements

The logger now includes 7 powerful enhancements that significantly improve debugging capabilities:

### 1. Inline Code Context ⭐ HIGHEST ROI
**Zero coupling** - Automatically extracts the failing line of code with surrounding context.

```javascript
{
  "code": {
    "fail": "expect(ast.statements[0].parameters[0].value.name).toBe('&INPUT')",
    "ctx": [
      "const code = 'PGM PARM(&INPUT)';",
      "const ast = parse(code);",
      "expect(ast.statements[0].parameters[0].value.name).toBe('&INPUT');"
    ],
    "line": { "start": 26, "failing": 28, "end": 31 }
  }
}
```

### 2. Smart Diff with Structure Analysis
**Low coupling** - Intelligently formats actual vs expected with hints about what went wrong.

```javascript
{
  "e": {
    "type": "TypeError",
    "msg": "Cannot read properties of undefined (reading 'name')",
    "actual": "parameters[0] = [{type:'VariableReference', name:'&INPUT'}]",
    "expected": "parameters[0].value.name",
    "hint": "Accessing .value on array - structure mismatch"
  }
}
```

### 3. Enhanced Stack Traces
**Zero coupling** - Shows function names and actual source code for each stack frame.

```javascript
{
  "stk": [
    {
      "fn": "expect",
      "at": "parser.test.js:28",
      "code": "expect(ast.statements[0].parameters...",
      "test": true
    },
    {
      "fn": "parse",
      "at": "index.js:76",
      "code": "return parser.match(code)",
      "test": false
    }
  ]
}
```

### 4. Persistent Index Database ⭐ HIGH VALUE
**Low coupling** - Stores test history in SQLite for trend analysis and flakiness detection.

```javascript
{
  "history": {
    "lastPassed": "2025-01-07T10:23:45Z",
    "failCount": 3,
    "totalRuns": 5,
    "flaky": {
      "passRate": "40.0",
      "isFlaky": true
    }
  },
  "similar": [
    { "test": "should parse DCL with parameters", "occurrences": 4 }
  ]
}
```

**Note**: Requires `better-sqlite3` package (optional dependency).

### 5. Smart Root Cause Analysis
**Zero coupling** - Analyzes failure patterns and provides actionable suggestions.

```javascript
{
  "rootCauses": [
    {
      "pattern": "Accessing property 'name' on undefined",
      "confidence": 0.95,
      "affectedTests": ["should parse PGM", "should parse DCL"],
      "count": 2,
      "suggestion": "Check if object exists before accessing property"
    }
  ]
}
```

### 6. Function Coverage Map
**Low coupling** - Integrates with V8 coverage to show execution paths.

```javascript
{
  "coverage": {
    "functions": [
      { "name": "parse", "file": "js/index.js", "line": 76 },
      { "name": "matchPgmStatement", "file": "js/grammar.js", "line": 123 }
    ],
    "executionPath": [
      { "fn": "parse", "file": "js/index.js:76", "fromStack": true }
    ]
  }
}
```

**Note**: Requires Vitest coverage to be enabled.

### 7. Quick Links and IDE Integration
**Low coupling** - Generates clickable links for VSCode, IntelliJ, and more.

```javascript
{
  "links": {
    "test": {
      "label": "parser.test.js",
      "vscode": "vscode://file/.../parser.test.js:28",
      "idea": "idea://open?file=...&line=28"
    },
    "source": {
      "label": "index.js",
      "vscode": "vscode://file/.../index.js:76"
    },
    "lastChange": "abc123f 2 days ago Fix parser structure"
  }
}
```

## Configuration

### All Enhancements Enabled

```javascript
// vitest.config.js
import { VitestReporter } from 'llm-compact-logger/adapters/vitest';

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
      new VitestReporter({
        outputDir: './debug',
        enhancements: {
          codeContext: true,        // Inline code - HIGHEST ROI
          diff: true,               // Smart diff formatting
          stack: true,              // Enhanced stack traces
          rootCause: true,          // Pattern analysis
          coverage: true,           // V8 coverage integration
          links: true,              // IDE links + git blame
          persistentIndex: {        // Historical tracking
            enabled: true,
            retentionDays: 30
          }
        }
      })
    ]
  }
};
```

### Minimal Configuration (Zero Extra Dependencies)

```javascript
new VitestReporter({
  outputDir: './debug'
  // All enhancements except coverage and persistentIndex are enabled by default
})
```

### Selective Enhancements

```javascript
new VitestReporter({
  outputDir: './debug',
  enhancements: {
    codeContext: true,
    diff: true,
    stack: true,
    rootCause: false,      // Disable
    coverage: false,       // Disable
    links: false,          // Disable
    persistentIndex: { enabled: false }
  }
})
```

## Roadmap

- [x] Core logger with token optimization
- [x] Vitest adapter
- [x] Jest adapter
- [x] Inline code context
- [x] Smart diff with structure analysis
- [x] Enhanced stack traces
- [x] Persistent index (SQLite)
- [x] Root cause analysis
- [x] Coverage integration (V8)
- [x] Quick links and IDE integration
- [ ] Mocha adapter
- [ ] Playwright adapter
- [ ] LLM query interface
- [ ] Diff-based reporting (state changes only)
- [ ] Web UI for report visualization

## Claude Code Integration

This repository includes [SKILL.md](./SKILL.md), a Claude Code Skill that helps Claude automatically:
- Interpret compact logger JSON output format
- Analyze debug reports with root cause patterns
- Configure the 7 enhancement features correctly
- Troubleshoot common setup issues

To use in Claude Code, add this repository as a Project and the Skill will be automatically loaded.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT

## Credits

Created to solve the token-efficiency problem when debugging with LLMs like Claude, GPT-4, etc.
