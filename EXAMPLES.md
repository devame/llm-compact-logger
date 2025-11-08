# How LLMs Should Query llm-compact-logger Output

This guide explains optimal strategies for LLMs analyzing test failures with llm-compact-logger.

## Quick Start

**Read the compact report first:**
- `debug-compact.json` (~18 tokens vs ~88 for full report)
- Contains all essential failure information
- Only read `debug-report.json` if compact version lacks needed details

**What to look for when tests fail:**

1. ✓ **Tests passed?** → Move on
2. ✗ **Tests failed?** → Check these in order:
   - Error message & type (`e.type`, `e.msg`)
   - Code context (failing line + surroundings in `code`)
   - Smart diff (expected vs actual with hints in `e.hint`)
   - Stack trace (with source code per frame in `stk`)
   - Root cause suggestions (pattern analysis in `meta.rootCauses`)
   - Coverage data (what code executed/skipped in `coverage`)

## Use jq for Surgical Queries (Not grep)

**Why jq > grep:**
- ✓ Structured JSON queries prevent false matches
- ✓ Extract exact fields without parsing noise
- ✓ Combine filters to narrow to specific failures
- ✓ Works with nested enhancement data
- ✗ grep matches anywhere, including keys, causing false positives

### Essential jq Queries

**Get failed test names:**
```bash
jq '.testResults[] | select(.status=="failed") | .name' debug-compact.json
```

**Extract error messages only:**
```bash
jq '.testResults[].errors[].message' debug-report.json
```

**Find root cause suggestions:**
```bash
jq '.testResults[].enhancements.rootCause.suggestions[]' debug-report.json
```

**Get code context for specific test:**
```bash
jq '.testResults[] | select(.name | contains("examples")) | .enhancements.codeContext' debug-report.json
```

**Check coverage for uncovered lines:**
```bash
jq '.testResults[].enhancements.coverage.uncoveredLines' debug-report.json
```

**Get all failures with their error types:**
```bash
jq '.testResults[] | select(.status=="failed") | {test: .name, error: .errors[0].type}' debug-compact.json
```

**Find flaky tests:**
```bash
jq '.testResults[] | select(.enhancements.history.flaky.isFlaky == true) | .name' debug-report.json
```

**Extract stack traces for specific test:**
```bash
jq '.testResults[] | select(.name == "should validate email") | .enhancements.stack' debug-report.json
```

**Get diff hints for assertion failures:**
```bash
jq '.testResults[] | select(.errors[0].type == "AssertionError") | .enhancements.diff.hint' debug-report.json
```

**List all IDE navigation links:**
```bash
jq '.testResults[].enhancements.links | {test: .test.vscode, source: .source.vscode}' debug-report.json
```

## Common Query Patterns

### "What test failed and why?"
```bash
jq '.testResults[] | select(.status=="failed") | {
  test: .name,
  file: .file,
  error: .errors[0].type,
  message: .errors[0].message
}' debug-compact.json
```

### "Show me the failing code"
```bash
jq '.testResults[] | select(.status=="failed") | {
  test: .name,
  failingLine: .enhancements.codeContext.fail,
  context: .enhancements.codeContext.ctx
}' debug-report.json
```

### "Why is the assertion wrong?"
```bash
jq '.testResults[] | select(.status=="failed") | {
  test: .name,
  hint: .enhancements.diff.hint,
  expected: .errors[0].expected,
  actual: .errors[0].actual,
  rootCause: .enhancements.rootCause.suggestions[0]
}' debug-report.json
```

### "What code wasn't executed?"
```bash
jq '.testResults[] | select(.status=="failed") | {
  test: .name,
  uncovered: .enhancements.coverage.uncoveredLines,
  totalFunctions: .enhancements.coverage.totalFunctions
}' debug-report.json
```

### "Which tests are flaky?"
```bash
jq '.testResults[] | select(.enhancements.history.flaky.isFlaky) | {
  test: .name,
  passRate: .enhancements.history.flaky.passRate,
  runs: .enhancements.history.flaky.totalRuns
}' debug-report.json
```

### "What's the highest confidence root cause?"
```bash
jq '.meta.rootCauses | sort_by(-.confidence) | .[0]' debug-report.json
```

## Working with Compact Format

The compact format uses abbreviated keys to reduce token count. Key mappings:

```bash
# Get test name (t), file location (f), and error (e)
jq '.testResults[] | {name: .t, location: .f, error: .e}' debug-compact.json

# Summary statistics (sum.tot, sum.pas, sum.fai, sum.rate)
jq '.sum | {total: .tot, passed: .pas, failed: .fai, passRate: .rate}' debug-compact.json

# Error details (e.type, e.msg, e.E=expected, e.R=received)
jq '.testResults[].e | {type: .type, message: .msg, expected: .E, actual: .R}' debug-compact.json
```

See [REFERENCE.md](REFERENCE.md) for complete key mappings.

## Best Practices for LLMs

1. **Start compact:** Always read `debug-compact.json` first for overview
2. **Query precisely:** Use jq to extract only needed fields
3. **Filter early:** Use `select()` to narrow results before extracting fields
4. **Combine insights:** Cross-reference root causes with code context and diffs
5. **Check confidence:** Root cause patterns with >0.85 confidence are actionable
6. **Consider history:** Flaky tests need different treatment than consistent failures
7. **Follow the chain:** Error message → Code context → Diff → Stack → Root cause

## Example Analysis Workflow

```bash
# 1. Get summary
jq '.sum' debug-compact.json

# 2. If failures exist, get error types
jq '.testResults[] | select(.status=="failed") | .e.type' debug-compact.json

# 3. For specific error type, get details
jq '.testResults[] | select(.e.type=="TypeError")' debug-compact.json

# 4. If root cause available, check confidence
jq '.meta.rootCauses[] | select(.confidence > 0.85)' debug-report.json

# 5. Get code context for high-confidence issues
jq '.testResults[] | select(.e.msg | contains("undefined")) | .code' debug-report.json
```
