# Validation Summary: How to Use clickhouse-format for Query Formatting

## Status
validated

## Post Type
Tutorial / Developer Tool Guide

## Technologies Covered
- ClickHouse (`clickhouse-format` CLI utility)
- Shell / Bash scripting
- Git pre-commit hooks
- Neovim / Vim
- VS Code (External Formatters extension)
- SQL

## Sources Consulted
- Official ClickHouse docs: https://clickhouse.com/docs/operations/utilities/clickhouse-format
- ClickHouse source: `programs/format/Format.cpp` (flag parsing, entry point)
- ClickHouse source: `src/Parsers/obfuscateQueries.cpp` (obfuscation behavior)
- ClickHouse source: `src/Parsers/ASTCreateQuery.cpp` and `formatAST` helpers (CREATE TABLE formatting)

## Issues Found

1. **`--obfuscate` output was fabricated.** The post claimed the flag replaces string/numeric literals with fixed placeholders (`'foo@bar.com'`, `0.`). In reality, `--obfuscate` performs SipHash-based substitution: identifiers and string-literal tokens are replaced with words drawn from a built-in noun dictionary, and numeric literals are perturbed while preserving magnitude. It also preserves non-alphanumeric punctuation in strings. Rewrote the section with an accurate description and a representative output, noting that exact values are seed-dependent.

2. **CREATE TABLE column alignment was incorrect.** The sample output padded column names with spaces to visually align types (`event_id    UInt64`). `clickhouse-format` does not space-pad column names — it emits single-space separation. Fixed the output accordingly.

3. **CREATE TABLE column names were not backticked.** `clickhouse-format` wraps identifiers in backticks in the canonical `CREATE TABLE` AST output. Updated the sample output to use backticks.

4. **`ORDER BY` was broken across two lines.** The original output showed `ORDER BY` on its own line with the tuple on the next line. The formatter emits `ORDER BY (event_time, event_type)` on a single line. Fixed.

## Review Notes

- The `--multiquery` / `-n` flag for `clickhouse-format` is still documented and functional. Note that in `clickhouse-client` and `clickhouse-local`, multi-query became the default and the flag is considered deprecated in the client tools, but this does not currently apply to `clickhouse-format` itself. No change needed, but readers using very recent ClickHouse releases may see deprecation messaging in related tools.
- `--hilite` only works in builds that include the `replxx` library; it may exit with code 2 on builds without syntax-highlight support. Not flagged in the post, but worth noting for readers.
- The `WHERE event_time >= (today() - INTERVAL 7 DAY)` output preserves the `INTERVAL` syntax in the post. Some ClickHouse versions canonicalize `INTERVAL 7 DAY` to `toIntervalDay(7)` in formatter output; the exact form is version-dependent and both are accepted re-inputs. Left as-is since the semantics are correct.
- The pre-commit hook example works but will rewrite files even when they are already correctly formatted; readers may prefer a check-only version in CI.
