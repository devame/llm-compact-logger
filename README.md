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

## Roadmap

- [x] Core logger with token optimization
- [x] Vitest adapter
- [x] Jest adapter
- [ ] Mocha adapter
- [ ] Playwright adapter
- [ ] SQLite historical storage
- [ ] LLM query interface
- [ ] Diff-based reporting (state changes only)
- [ ] Web UI for report visualization

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
