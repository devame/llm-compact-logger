# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-11-08

### Fixed

**ESM compatibility for persistent index (better-sqlite3)**

- Fixed `require()` usage in persistent-index.js causing failures in ESM contexts
- Converted `loadDatabase()` to async with dynamic `import()` instead of CommonJS `require()`
- Implemented lazy initialization pattern - database loads on first use, not in constructor
- Made all database methods async (`recordTestRun`, `recordTestResults`, `getTestHistory`, `findSimilarFailures`, `getFlakiness`)
- Updated quick-links enhancer to handle async database queries
- Updated vitest-adapter to properly await all async database operations

### Technical Details

**Root Cause:** The `loadDatabase()` method used CommonJS `require('better-sqlite3')` which fails in ESM projects even when the package is installed.

**Solution:**
1. Changed `loadDatabase()` from sync to async using `await import('better-sqlite3')`
2. Implemented lazy initialization - `initialize()` is now called on first database use, not in constructor
3. Added `initPromise` to prevent multiple concurrent initializations
4. Made all database methods async and call `await this.initialize()` before accessing db
5. Updated all callers in vitest-adapter.js to await async database operations

**Impact:** Persistent index enhancement now works correctly with better-sqlite3 installed in ESM projects.

## [0.2.1] - 2025-11-08

### Fixed

**Critical bug fix for enhancement loading in Vitest context**

- Fixed `ReferenceError: InlineCodeContextEnhancer is not defined` error when using Vitest
- Changed `createEnhancers()` to use dynamic imports instead of static imports
- Made enhancement loading lazy and asynchronous (happens in `onFinished` instead of `onInit`)
- Only instantiate enhancers that are explicitly enabled (previously created all regardless of config)
- Added graceful error handling for enhancement loading failures

### Technical Details

**Root Cause:** Static ES module imports in `enhancements/index.js` were not resolving properly in Vitest's runtime context, causing all enhancement classes to be undefined when `createEnhancers()` was called.

**Solution:**
1. Made `createEnhancers()` async and use dynamic imports (`await import(...)`)
2. Moved enhancement loading from `onInit()` (sync) to `onFinished()` (async)
3. Added conditional instantiation - only create enhancers when enabled
4. Added try-catch wrapper for graceful degradation

**Impact:** All 7 enhancements now work correctly with Vitest. Users no longer need to disable enhancements as a workaround.

## [0.2.0] - 2025-11-08

### Added - Major Enhancement Suite
This release adds 7 powerful enhancements that transform the logger into a comprehensive debugging tool while maintaining the core token-efficiency goal.

#### 1. Inline Code Context ⭐ HIGHEST ROI
- Automatically extracts failing line of code with surrounding context
- Shows 3 lines before and after the failure point
- Zero coupling - only reads files that test frameworks already provide
- Configurable context window size

#### 2. Smart Diff with Structure Analysis
- Intelligent actual vs expected comparison
- Automatic type mismatch detection
- Structure difference analysis for objects and arrays
- AI-powered hints about what went wrong (e.g., "Type mismatch: got array but expected object")
- Missing/extra property detection
- Works with Vitest, Jest, and Chai assertion libraries

#### 3. Enhanced Stack Traces
- Function names extracted from stack frames
- Actual source code shown for each frame
- Smart path shortening for readability
- Distinguishes test files from source files
- Configurable frame limit and code truncation

#### 4. Persistent Index Database ⭐ HIGH VALUE
- SQLite-based test history tracking
- Flakiness detection with pass rate calculation
- Find similar failures across test runs
- Git integration (commit hash and branch tracking)
- Automatic cleanup of old data (configurable retention)
- Optional dependency on `better-sqlite3` with graceful degradation

#### 5. Smart Root Cause Analysis
- Pattern matching across multiple failures
- Groups failures by error type with confidence scores
- Actionable suggestions for common error patterns
- Identifies common source files across failures
- Detects: undefined property access, type mismatches, array length issues, timeouts, and more
- Zero coupling - analyzes existing error data

#### 6. Function Coverage Map
- Integrates with Vitest V8 coverage
- Shows which functions were executed during test
- Builds execution path from stack trace + coverage
- Coverage summary statistics
- Zero additional instrumentation needed

#### 7. Quick Links and IDE Integration
- Generates VSCode, IntelliJ IDEA, and file:// links
- Click to jump directly to failing line
- Git blame integration showing last change
- Links to related failing tests
- Optional git tracking with graceful degradation

### Enhanced

- **VitestReporter**: Now applies all enhancements automatically
- **Configuration**: All enhancements enabled by default (except persistent index)
- **Output Format**: Enhanced failures include code context, smart diffs, enhanced stacks, and more
- **Console Output**: Now shows root cause analysis summary
- **Error Analysis**: Root cause patterns displayed in console with suggestions

### Configuration

- New `enhancements` option in VitestReporter
- Each enhancement can be enabled/disabled independently
- Detailed configuration options for each enhancement
- Backward compatible - all options are optional

### Examples

- `vitest-with-enhancements.config.js` - Complete configuration example
- `vitest-minimal-enhancements.config.js` - Minimal setup example

### Dependencies

- Added optional dependency: `better-sqlite3` ^9.0.0 (for persistent index)
- No breaking changes to existing dependencies

### Technical Details

- All enhancements maintain low/zero coupling with test frameworks
- Graceful degradation when optional dependencies unavailable
- Enhancements are composable and can be used independently
- No performance impact when disabled
- File operations are safe with try-catch error handling

## [0.1.0] - 2025-11-08

### Added
- Core `CompactLogger` class with token-efficient JSON output
- `BaseAdapter` interface for creating framework adapters
- `VitestAdapter` and `VitestReporter` for Vitest integration
- `JestAdapter` and `JestReporter` for Jest integration
- Dual output format: full report + ultra-compact version
- Automatic failure grouping by file
- Top error type analysis
- Token estimation for reports
- Comprehensive documentation and examples
- Example for standalone usage
- Example for custom adapter creation
- MIT License

### Features
- ~85-90% token reduction compared to verbose output
- Framework-agnostic design
- Abbreviated JSON keys (t, f, e, E, R, etc.)
- Git commit tracking in metadata
- Configurable output directory and filenames
- Stack trace extraction
- Custom metadata support
- jq-friendly JSON structure

[0.1.0]: https://github.com/devame/llm-compact-logger/releases/tag/v0.1.0
