# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
