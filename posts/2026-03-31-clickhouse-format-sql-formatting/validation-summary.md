# Validation Summary: How to Use clickhouse-format for SQL Formatting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- clickhouse-format (CLI tool bundled with ClickHouse)
- Bash scripting
- Git pre-commit hooks
- CI pipelines

## Sources Consulted
- ClickHouse official documentation for clickhouse-format: https://clickhouse.com/docs/en/operations/utilities/clickhouse-format
- ClickHouse CLI reference: https://clickhouse.com/docs/en/interfaces/cli
- `clickhouse-format --help` output

## Issues Found
No technical issues found.

- `--query`, `--hilite`, and `--multiquery` (alias `-n`) are valid flags documented in the official ClickHouse utilities reference.
- Reading from stdin and writing to stdout (the `<` and `>` redirection patterns used throughout) is the default behavior of `clickhouse-format` when no `--query` argument is supplied.
- The formatted output example (parenthesized `(now() - INTERVAL 1 DAY)`, uppercase keywords, 4-space indented column list) matches the canonical style produced by the tool.
- The package installation path `/usr/bin/clickhouse-format` matches the default location when installed via the official DEB/RPM packages.
- The CI check script and pre-commit hook examples are logically correct bash.

## Review Notes
- The `--multiquery` flag also has a short form `-n`; the post uses the long form consistently, which is fine for clarity.
- An additional useful flag not covered is `--oneline`, which outputs the formatted query on a single line (useful in some CI or logging contexts). Not a correctness issue — just a potential future addition.
- `clickhouse-format` does not have a native `--check` / exit-non-zero-if-unformatted mode, so the CI and pre-commit examples correctly implement this themselves via diff comparison.
