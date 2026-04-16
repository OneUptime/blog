# Validation Summary: How to Use nullIf() to Convert Values to NULL in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- NULL handling functions (`nullIf`, `ifNull`, `isNull`)
- Aggregate functions (`avg`, `sum`, `count`, `min`)

## Sources Consulted
- ClickHouse official docs — Functions for working with nulls: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse official docs — Nullable data type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse official docs — Aggregate functions (NULL handling semantics): https://clickhouse.com/docs/en/sql-reference/aggregate-functions

## Issues Found
No technical issues found.

All claims verified against official ClickHouse documentation:
- `nullIf(x, y)` signature and semantics (returns NULL if `x = y`, else `x`) are correct.
- Return type `Nullable(T)` is correct; `nullIf(42, 0)` yields `Nullable(UInt8)` because integer literal `42` is inferred as `UInt8`.
- NULL propagation in arithmetic (division by NULL returns NULL) is correct.
- Aggregate functions (`avg`, `sum`, `count`, `min`) ignore NULL inputs — correct.
- The `CASE WHEN a = b THEN NULL ELSE a END` equivalence is accurate.
- The "inverse of `ifNull()`" framing is a reasonable informal description, matching the standard SQL characterization.

## Review Notes
- The description of `nullIf` as the "inverse of `ifNull()`" is informal but widely used and not misleading in this context.
- Strictly speaking, `nullIf` compares arguments with standard equality semantics, so two NULLs are not considered equal (both arguments are NULL yields NULL regardless). Not covered in the post but not incorrect either — the examples use concrete sentinel values.
- Post is concise, accurate, and aligned with current ClickHouse (24.x+) behavior. No deprecations apply.
