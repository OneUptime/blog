# Validation Summary: How to Use JSONExtractInt() and JSONExtractFloat() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL functions for JSON extraction)
- JSON parsing within `String` columns
- ClickHouse materialized columns
- ClickHouse type casting (`toUInt32`, `toDecimal64`)

## Sources Consulted
- ClickHouse official documentation — JSON functions: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse official documentation — `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractString`, `JSONHas`
- ClickHouse documentation — Materialized columns: https://clickhouse.com/docs/en/sql-reference/statements/create/table#materialized
- ClickHouse documentation — Type conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions

## Issues Found
No technical issues found.

Key claims verified:
- `JSONExtractInt` returns `Int64` — correct.
- `JSONExtractFloat` returns `Float64` — correct.
- Both functions return `0` when the key is missing or the value cannot be cast — correct (this is the documented default for the typed `JSONExtract*` family).
- Nested path extraction via variadic `indices_or_keys` arguments — correct.
- `JSONHas(payload, 'key')` returns whether a key exists — correct.
- `ALTER TABLE ... ADD COLUMN ... MATERIALIZED ...` syntax — correct.
- `toUInt32` and `toDecimal64(value, scale)` casts — correct signatures.

## Review Notes
- The post correctly notes that filtering on `JSONExtract*` expressions cannot use the primary index; this matches ClickHouse's behavior since computed expressions are evaluated per-row at query time.
- ClickHouse has been steadily expanding its native `JSON` type (and `Object('json')` previously). For new schemas at scale, users may want to consider the native `JSON` type as an alternative to storing raw JSON in `String` columns, but the `JSONExtract*` functions described here remain fully supported and idiomatic for the `String`-backed pattern.
- The materialized column section is accurate; note that newly added MATERIALIZED columns are computed for new inserts and during merges/back-fills — readers planning a production rollout should be aware that historical parts may need explicit rewriting (`OPTIMIZE TABLE ... FINAL` or similar) to fully populate. This is a useful caveat but not a technical error.
