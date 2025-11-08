# Creating Custom Skills for LLM Compact Logger

This guide shows you how to create custom Claude Code Skills for working with the LLM Compact Logger. Skills help Claude understand your debugging workflows and apply domain-specific knowledge automatically.

## What are Skills?

Skills are reusable packages that give Claude specialized knowledge about your tools, frameworks, or workflows. When you mention certain keywords or scenarios, Claude automatically loads the relevant Skill to help you more effectively.

For the LLM Compact Logger, you might create Skills for:
- **Analyzing debug reports** - Automatically interpret compact logger output
- **Configuring enhancements** - Help set up the 7 enhancement features
- **Writing custom adapters** - Guide for creating framework adapters
- **Test debugging workflows** - Domain-specific debugging patterns

## Skill Structure

Every Skill requires a directory with a `Skill.md` file:

```
llm-logger-analyzer/
├── Skill.md          # Main Skill file (required)
├── REFERENCE.md      # Optional reference materials
└── resources/        # Optional supporting files
    ├── examples/
    └── templates/
```

## Example 1: Debug Report Analyzer Skill

This Skill helps Claude automatically understand and analyze compact logger output.

**Directory:** `llm-logger-analyzer/`

**File:** `Skill.md`

```markdown
---
name: LLM Logger Debug Report Analyzer
description: Analyze and interpret llm-compact-logger JSON output, identify patterns, and suggest fixes
version: 1.0.0
---

# LLM Logger Debug Report Analyzer

## Purpose

This Skill helps analyze JSON debug reports from llm-compact-logger, interpreting the abbreviated format and providing actionable debugging insights.

## When to Use

Apply this Skill when:
- User shares debug-compact.json or debug-report.json files
- User mentions "compact logger output" or "test failures"
- User asks to analyze test results from llm-compact-logger
- User references file paths ending in `debug-compact.json` or `debug-report.json`

## Key Abbreviations Reference

When analyzing compact logger output, use these abbreviations:

| Key | Meaning | Example |
|-----|---------|---------|
| `t` | Test/check name | `"should validate email"` |
| `f` | File:line location | `"auth.test.js:42"` |
| `e` | Error object | Contains type, msg, E, R |
| `E` | Expected value | `"valid email"` |
| `R` | Received/actual value | `"invalid"` |
| `stk` | Stack trace | Can be string or array |
| `code` | Inline code context | Has `fail`, `ctx`, `line` |
| `links` | IDE links | VSCode, IDEA, file:// |
| `coverage` | Coverage info | Functions executed |
| `history` | Test history | From persistent index |

## Analysis Steps

When a user provides a compact logger report:

1. **Check for root causes**: Look for `rootCauses` array in metadata
2. **Identify patterns**: Group failures by error type in `topFails`
3. **Review code context**: If `code` field exists, show the failing line
4. **Examine diffs**: Look at `actual` vs `expected` with `hint` field
5. **Check history**: If `history` exists, identify flaky tests
6. **Suggest fixes**: Based on error patterns and root cause analysis

## Example Analysis Format

When analyzing a report, structure your response as:

```
📊 Test Summary:
- Total: X tests (X passed, X failed)
- Pass rate: X%

🔍 Root Cause Analysis:
- [Pattern identified]: [Confidence]
- Suggestion: [Actionable advice]

💡 Key Failures:
1. Test name (file:line)
   - Error: [type]
   - Issue: [explanation]
   - Fix: [suggestion]

🔗 Quick Actions:
- [Link to failing line]
- [Git blame info if available]
```

## Common Error Patterns

### Undefined Property Access
```json
{
  "e": {
    "type": "TypeError",
    "msg": "Cannot read properties of undefined (reading 'name')",
    "hint": "Got undefined - property may not exist"
  }
}
```
**Fix:** Add null check: `if (obj?.name)` or verify object structure

### Type Mismatch
```json
{
  "e": {
    "actual": "[2 items]: [{...}]",
    "expected": "{value: {...}}",
    "hint": "Type mismatch: got array but expected object"
  }
}
```
**Fix:** Check if accessing wrong property or API changed return type

### Array Length Mismatch
```json
{
  "e": {
    "hint": "Array length mismatch: got 3 items but expected 2"
  }
}
```
**Fix:** Check if data changed, items filtered, or test expectations outdated

## Resources

- Documentation: https://github.com/devame/llm-compact-logger
- Abbreviation legend: Always in `debug-report.json` under `legend` key
```

**To package:**
```bash
cd path/to/skills
zip -r llm-logger-analyzer.zip llm-logger-analyzer/
```

## Example 2: Enhancement Configuration Skill

This Skill helps users configure the 7 enhancements properly.

**Directory:** `llm-logger-config/`

**File:** `Skill.md`

```markdown
---
name: LLM Logger Enhancement Config
description: Help configure llm-compact-logger's 7 enhancement features with best practices
version: 1.0.0
dependencies: vitest>=0.30.0
---

# LLM Logger Enhancement Configuration

## Purpose

Guide users through configuring the 7 enhancement features of llm-compact-logger, recommending optimal settings for their use case.

## When to Use

Apply when:
- User asks about "enabling enhancements"
- User mentions llm-compact-logger configuration
- User references vitest.config.js or Vitest setup
- User asks about specific enhancements (code context, root cause, etc.)

## Enhancement Overview

### 1. Inline Code Context ⭐ HIGHEST ROI
**Zero dependencies** - Always recommend enabling

```javascript
codeContext: {
  contextLines: 3  // Lines before/after failure (default: 3)
}
```

**Best for:** All projects
**Cost:** Minimal (file reads only)

### 2. Smart Diff
**Zero dependencies** - Always recommend enabling

```javascript
diff: {
  maxDepth: 3,        // Object nesting depth (default: 3)
  maxArrayItems: 5,   // Array items to show (default: 5)
  maxObjectKeys: 5    // Object keys to show (default: 5)
}
```

**Best for:** Projects with complex object/array assertions
**Cost:** Minimal (pure analysis)

### 3. Enhanced Stack Traces
**Zero dependencies** - Always recommend enabling

```javascript
stack: {
  maxFrames: 5,       // Stack frames to include (default: 5)
  maxCodeLength: 80   // Code truncation length (default: 80)
}
```

**Best for:** All projects
**Cost:** Minimal (file reads)

### 4. Root Cause Analysis
**Zero dependencies** - Always recommend enabling

```javascript
rootCause: {
  minGroupSize: 2,    // Min failures to form pattern (default: 2)
  maxSuggestions: 5   // Max suggestions to show (default: 5)
}
```

**Best for:** Projects with multiple tests
**Cost:** Minimal (pure analysis)

### 5. Persistent Index Database ⭐ HIGH VALUE
**Requires:** better-sqlite3 (optional dependency)

```javascript
persistentIndex: {
  enabled: true,        // Enable/disable (default: false)
  path: '.test-index',  // DB location (default: .test-index)
  retentionDays: 30,    // History retention (default: 30)
  trackGit: true        // Git integration (default: true)
}
```

**Best for:** CI/CD pipelines, flaky test detection
**Cost:** Requires better-sqlite3 package
**Installation:** `npm install --save-optional better-sqlite3`

### 6. Coverage Integration
**Requires:** Vitest coverage enabled

```javascript
coverage: {
  useCoverage: true,       // Enable/disable (default: true)
  coverageDir: '.coverage', // Coverage output (default: .coverage)
  maxFunctions: 10         // Functions to show (default: 10)
}
```

**Best for:** Projects already using coverage
**Cost:** Requires coverage setup in vitest.config.js

**Coverage setup:**
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

### 7. Quick Links
**Zero dependencies** (git optional)

```javascript
links: {
  trackGit: true,        // Git blame (default: true)
  maxRelatedTests: 3     // Related tests to show (default: 3)
}
```

**Best for:** All projects (especially VSCode/IDEA users)
**Cost:** Minimal (git commands are optional)

## Configuration Templates

### Minimal Setup (Zero Extra Dependencies)
```javascript
import { VitestReporter } from 'llm-compact-logger/adapters/vitest';

export default {
  test: {
    reporters: [
      'default',
      new VitestReporter({
        outputDir: './debug'
        // All enhancements enabled by default except persistent index
      })
    ]
  }
};
```

### Recommended Setup (With Coverage)
```javascript
import { VitestReporter } from 'llm-compact-logger/adapters/vitest';

export default {
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['json', 'text'],
      reportsDirectory: '.coverage'
    },
    reporters: [
      'default',
      new VitestReporter({
        outputDir: './debug',
        enhancements: {
          codeContext: true,
          diff: true,
          stack: true,
          rootCause: true,
          coverage: true,
          links: true,
          persistentIndex: { enabled: false }
        }
      })
    ]
  }
};
```

### Full Setup (All Features)
Requires: `npm install --save-optional better-sqlite3`

```javascript
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
          codeContext: { contextLines: 3 },
          diff: { maxDepth: 3, maxArrayItems: 5 },
          stack: { maxFrames: 5 },
          rootCause: { minGroupSize: 2 },
          coverage: { useCoverage: true },
          links: { trackGit: true },
          persistentIndex: {
            enabled: true,
            retentionDays: 30
          }
        }
      })
    ]
  }
};
```

## Decision Guide

Ask users:
1. **"Do you want test history tracking?"** → If yes, enable persistentIndex
2. **"Do you already have coverage enabled?"** → If yes, enable coverage enhancement
3. **"Are you using VSCode or IntelliJ?"** → If yes, ensure links enabled
4. **"Do you have flaky tests?"** → If yes, strongly recommend persistentIndex

## Troubleshooting

### "better-sqlite3 not installed" warning
User sees this when persistentIndex enabled but package missing.
**Fix:** `npm install --save-optional better-sqlite3` OR disable persistentIndex

### "Coverage file not found" warning
User sees this when coverage enhancement enabled but no coverage data.
**Fix:** Enable coverage in vitest.config.js OR disable coverage enhancement

### "Git commands failed" warnings
User sees this when git not available or not in a git repo.
**Fix:** These are graceful - links/metadata work without git, just less info
```

## Example 3: Custom Adapter Creation Skill

**Directory:** `llm-logger-custom-adapter/`

**File:** `Skill.md`

```markdown
---
name: LLM Logger Custom Adapter Creator
description: Guide for creating custom framework adapters for llm-compact-logger (Mocha, Playwright, etc)
version: 1.0.0
---

# Custom Adapter Creation Guide

## Purpose

Help developers create custom adapters for test frameworks not yet supported by llm-compact-logger.

## When to Use

Apply when:
- User wants to integrate with Mocha, Playwright, Cypress, etc.
- User asks "how to add llm-compact-logger to [framework]"
- User mentions creating a custom adapter

## Adapter Structure

All adapters extend `BaseAdapter` and implement three methods:

```javascript
import { BaseAdapter } from 'llm-compact-logger/adapters/base';

class MyFrameworkAdapter extends BaseAdapter {
  convertFailure(frameworkFailure) {
    // Convert to standardized format
  }

  convertPass(frameworkPass) {
    // Convert to standardized format
  }

  extractSummary(results) {
    // Extract summary stats
  }
}
```

## Standardized Failure Format

All adapters must return this structure:

```javascript
{
  name: string,              // Test name
  location: {
    file: string,           // File path
    line: number            // Line number (optional)
  },
  error: {
    type: string,           // Error type (e.g., "AssertionError")
    message: string,        // Error message
    expected: any,          // Expected value (optional)
    actual: any,            // Actual value (optional)
    stack: string           // Stack trace (optional)
  },
  context: object           // Additional context (optional)
}
```

## Template

```javascript
/**
 * [Framework] Adapter for LLM Compact Logger
 */

import { BaseAdapter } from 'llm-compact-logger/adapters/base';
import { CompactLogger } from 'llm-compact-logger';

export class [Framework]Adapter extends BaseAdapter {
  convertFailure(test) {
    return {
      name: test.title || test.name,
      location: {
        file: test.file,
        line: test.line || this.extractLine(test)
      },
      error: {
        type: test.error?.name || 'Error',
        message: test.error?.message || '',
        expected: test.error?.expected,
        actual: test.error?.actual,
        stack: test.error?.stack
      }
    };
  }

  convertPass(test) {
    return {
      name: test.title || test.name,
      location: { file: test.file },
      duration: test.duration || 0
    };
  }

  extractSummary(results) {
    return {
      tot: results.total,
      pas: results.passed,
      fai: results.failed,
      rate: Math.round((results.passed / results.total) * 100)
    };
  }

  extractLine(test) {
    // Framework-specific line extraction
    return test.location?.line || 0;
  }
}

export class [Framework]Reporter {
  constructor(options = {}) {
    this.logger = new CompactLogger({
      outputDir: options.outputDir || '.',
      metadata: { framework: '[framework]' },
      ...options
    });
    this.adapter = new [Framework]Adapter(this.logger);
  }

  // Implement framework-specific reporter methods
  onTestComplete(test) {
    if (test.status === 'failed') {
      this.logger.logFailure(this.adapter.convertFailure(test));
    } else if (test.status === 'passed') {
      this.logger.logPass(this.adapter.convertPass(test));
    }
  }

  async onComplete(results) {
    const summary = this.adapter.extractSummary(results);
    await this.logger.finalize(summary);
  }
}
```

## Framework-Specific Examples

### Mocha
Key properties: `test.title`, `test.file`, `test.err`

### Playwright
Key properties: `result.error`, `result.location`, `result.duration`

### Cypress
Key properties: `test.title`, `test.err`, `test.file`

## Testing Checklist

- [ ] Failures logged with correct name and location
- [ ] Error messages captured properly
- [ ] Expected/actual values extracted
- [ ] Stack traces preserved
- [ ] Summary stats calculated correctly
- [ ] File paths are relative
- [ ] Output files generated in correct location
```

## Using Skills

### 1. Create the Skill Directory

```bash
mkdir llm-logger-analyzer
cd llm-logger-analyzer
# Create Skill.md with content above
```

### 2. Package the Skill

```bash
cd ..
zip -r llm-logger-analyzer.zip llm-logger-analyzer/
```

**Important:** The folder must be the root of the ZIP, not nested!

### 3. Install in Claude

1. Open Claude Code or Claude.ai
2. Go to Settings > Skills
3. Upload the ZIP file
4. Enable the Skill

### 4. Test the Skill

Try prompts like:
- "Analyze this debug report" (with file attached)
- "Help me configure llm-compact-logger enhancements"
- "Create a Mocha adapter for llm-compact-logger"

Claude will automatically load the appropriate Skill based on your description.

## Best Practices

1. **Specific Descriptions:** Write clear descriptions about when to use the Skill
2. **Progressive Disclosure:** Put detailed info in the Markdown body, not metadata
3. **Real Examples:** Include actual JSON samples and code snippets
4. **Error Patterns:** Document common issues and solutions
5. **Keep Focused:** One Skill per workflow (analyzer, config, adapter creation)
6. **Version Tracking:** Update version when changing functionality

## Troubleshooting

**Skill not loading?**
- Check the description - Claude uses it to decide when to invoke
- Make sure ZIP structure is correct (folder as root)
- Enable in Settings after uploading

**Wrong Skill activating?**
- Make descriptions more specific
- Check for keyword overlap with other Skills
- Review Claude's thinking to see why it chose the Skill

## Contributing

Share your custom Skills with the community:
1. Create a `skills/` directory in your fork
2. Add your Skill with documentation
3. Submit a pull request to https://github.com/devame/llm-compact-logger

## Resources

- [Official Skills Guide](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills)
- [Anthropic Skills Examples](https://github.com/anthropics/skills)
- [LLM Compact Logger Docs](https://github.com/devame/llm-compact-logger)
