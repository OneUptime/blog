# Validation Summary: How to Use arrayElement() and Indexing in ClickHouse Arrays

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL (Array functions: `arrayElement`, `arraySlice`, `arrayMap`, `length`)
- MergeTree engine

## Sources Consulted
- ClickHouse Array Functions reference: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse Working with Arrays guide: https://clickhouse.com/docs/guides/working-with-arrays
- ClickHouse Conditional functions (`if`): https://clickhouse.com/docs/sql-reference/functions/conditional-functions

## Issues Found
No technical issues found.

Verified claims:
- ClickHouse arrays are 1-indexed — correct.
- `arrayElement(arr, n)` and `arr[n]` bracket notation are equivalent — correct.
- Negative indices (e.g., `arr[-1]`) access elements from the end — correct.
- Out-of-bounds access on constant arrays returns the element type's default (0 for numbers, `''` for strings) — correct.
- `arraySlice(arr, offset, length)` signature — correct.
- `arrayMap(lambda, arr)` signature — correct.
- `length(arr)` returns `UInt64` — correct.
- `CREATE TABLE ... ENGINE = MergeTree() ORDER BY ...` syntax — correct.
- `if(cond, then, NULL)` returning `Nullable(T)` via type promotion — correct.

## Review Notes
- Minor nuance not covered by the post: for non-constant arrays, accessing index `0` raises an error (ClickHouse arrays start at 1). The post correctly emphasizes 1-based indexing but does not mention the index-0 error case. This is a reasonable omission for an introductory tutorial.
- `toUInt64(length(tags))` in the "Dynamic Index" example is technically redundant since `length()` already returns `UInt64`, but it is not incorrect and may be intentional for readability.
- The safe-access pattern using `if(length(arr) >= 2, arr[2], NULL)` relies on ClickHouse promoting the result type to `Nullable(UInt8)`; this works in current ClickHouse versions.
