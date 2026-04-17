# Validation Summary: How to Use empty() and notEmpty() for Arrays in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse array functions (`empty`, `notEmpty`, `length`, `arrayFilter`, `groupArray`, `countIf`)
- ClickHouse Memory table engine

## Sources Consulted
- ClickHouse official documentation — Array Functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — `groupArray` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse documentation — Table Engines (Memory): https://clickhouse.com/docs/en/engines/table-engines/special/memory
- ClickHouse documentation — operators and conditional functions (`if`, `countIf`, `HAVING`)

## Issues Found
No technical issues found.

All claims and code examples were verified:

- Function signatures: `empty(arr)` and `notEmpty(arr)` both return `UInt8` (0 or 1). Correct.
- Both functions operate on strings and arrays. Correct.
- Array literal syntax (`[]`, `[1, 2, 3]`, `['']`) and results are correct.
- `CREATE TABLE ... ENGINE = Memory` and `INSERT ... VALUES` syntax are valid.
- ClickHouse uses 1-based array indexing; `arr[1]` is the first element. Correct.
- Accessing an element of an empty array returns the default value for that element type (e.g., `0` for `UInt32`). Correct.
- `if(cond, val, NULL)` produces a `Nullable` result — valid usage.
- `countIf(predicate)` is a valid aggregate combinator — syntax correct.
- `groupArray` silently drops `NULL` inputs — the explicit `arrayFilter(x -> x IS NOT NULL, ...)` in the HAVING example is redundant but not incorrect; the query still behaves as described.
- Walk-through arithmetic for each query (filter results, counts, engagement scores) matches the claimed outputs for the inserted rows.
- `empty(x)` is equivalent to `length(x) = 0`, as stated.

## Review Notes
- The HAVING example uses `arrayFilter(x -> x IS NOT NULL, viewed_pages)`; since `groupArray` already excludes `NULL` values, the filter is effectively a no-op. The example remains correct and could be simplified to `HAVING notEmpty(viewed_pages)`, but this is a stylistic improvement, not a technical error.
- `empty` and `notEmpty` have been stable ClickHouse functions for many years with no deprecation; the post should remain accurate for current and near-future ClickHouse versions.
