# Validation Summary: How to Use protocol() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL analytical database)
- ClickHouse URL functions: `protocol()`, `domain()`, `path()`, `queryString()`
- ClickHouse string functions: `splitByChar()`
- ClickHouse window functions (`OVER` clause)
- ClickHouse materialized columns (`ALTER TABLE ADD COLUMN ... MATERIALIZED`)

## Sources Consulted
- ClickHouse official documentation — URL functions: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse official documentation — ALTER TABLE ADD COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse official documentation — String splitting functions: https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions

## Issues Found
1. **Inaccurate description of scheme extraction mechanism.** The intro stated that `protocol()` extracts "everything before the `://` separator," but the post's own example shows `mailto:user@example.com` returning `mailto` — and `mailto:` uses a single `:` rather than `://`. The official documentation lists `mailto` as a typical return value, confirming the function handles non-hierarchical schemes too. Fixed the intro to clarify that the function extracts the part before `://` for hierarchical URLs or before `:` for schemes like `mailto:`.

## Review Notes
- The `ws` and `wss` WebSocket schemes are not explicitly listed in the official documentation's typical return values (which lists `http`, `https`, `ftp`, `mailto`, `tel`, `magnet`). However, since the function performs string extraction rather than matching against a whitelist, these schemes will work correctly in practice. No change needed, but worth noting.
- The `splitByChar('/', path(url))[2]` expression is correct: `path()` returns a string with a leading `/`, so splitting by `/` produces an empty string at index `[1]`, making `[2]` the first meaningful path segment. ClickHouse arrays are 1-indexed.
- The window function usage `sum(count()) OVER ()` in the percentage calculation is valid ClickHouse syntax.
- All SQL examples are syntactically correct and use current, non-deprecated ClickHouse functions.
