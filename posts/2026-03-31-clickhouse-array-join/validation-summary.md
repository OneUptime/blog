# Validation Summary: How to Use ARRAY JOIN in ClickHouse to Unnest Arrays

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ARRAY JOIN clause
- Array data types
- Nested data types
- Array functions (`arrayEnumerate`, `arrayDistinct`, `splitByChar`)

## Sources Consulted
- ClickHouse docs — ARRAY JOIN clause: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse docs — Array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse docs — Splitting and merging functions: https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions
- ClickHouse docs — Nested data structures: https://clickhouse.com/docs/en/sql-reference/data-types/nested-data-structures/nested

## Issues Found
No technical issues found.

Verified claims:
- `ARRAY JOIN` placement after `FROM` and before `WHERE` — correct.
- Multiple arrays in a single `ARRAY JOIN` are zipped (direct sum), not cross-joined; arrays must have the same length per row by default.
- `arrayEnumerate(arr)` returns `[1, 2, ..., length(arr)]` as `Array(UInt32)` — 1-based positions.
- `ARRAY JOIN` on a `Nested` column expands all inner columns in sync (they share an implicit array length).
- `INSERT INTO ... VALUES` for a `Nested` column using separate arrays per inner field is valid syntax.
- `LEFT ARRAY JOIN` preserves rows with empty arrays (populating defaults), while plain `ARRAY JOIN` drops them.
- `splitByChar(sep, str)` and `arrayDistinct(arr)` exist and behave as described.

## Review Notes
- Minor caveat (not an error): since ClickHouse 21.x, the `enable_unaligned_array_join` setting allows joining arrays of different lengths in a single `ARRAY JOIN`. The post's statement that arrays "must have the same length per row" reflects the default/common behavior and is accurate for most users; mentioning this setting could be a future improvement but is not required for correctness.
- The `Nested(...)` data type is classic ClickHouse syntax and still fully supported; no deprecation concerns.
