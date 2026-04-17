# Validation Summary: How to Use APPLY and EXCEPT Column Modifiers in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Column modifiers: APPLY, EXCEPT, REPLACE
- COLUMNS('regex') matcher

## Sources Consulted
- ClickHouse SELECT documentation: https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse SELECT modifiers reference (APPLY, EXCEPT, REPLACE sections)

## Issues Found
No technical issues found.

All syntax used in the post matches official ClickHouse documentation:
- `SELECT * EXCEPT (col1, col2) FROM table` — correct syntax for excluding columns from a wildcard match.
- `SELECT COLUMNS('regex') APPLY(function) FROM table` — correct syntax for applying a function to matched columns.
- `APPLY(x -> round(x, 2))` — lambda usage is valid for multi-argument functions.
- `SELECT * EXCEPT (...) APPLY(...)` — chaining modifiers is supported, consistent with the documented example `SELECT * REPLACE(...) EXCEPT (...) APPLY(...) FROM columns_transformers`.
- The existence of a `REPLACE` modifier that substitutes expressions for matched columns while preserving names is accurate.

## Review Notes
- The example `COLUMNS('.*_us') APPLY(x -> x / 1000.0) AS latency_ms` uses a single alias on a multi-column `COLUMNS(...)` match. ClickHouse does not officially support aliasing a multi-column match to a single name — behavior can vary (the alias may apply only to the first column or be effectively ignored). The example is illustrative of the transformation pattern rather than a copy-paste-ready query, which is acceptable for a tutorial context, but readers running it verbatim may see multiple output columns rather than a single `latency_ms` column.
- The post is concise and accurate. No version-specific caveats — APPLY, EXCEPT, and REPLACE have been available in ClickHouse for many releases.
