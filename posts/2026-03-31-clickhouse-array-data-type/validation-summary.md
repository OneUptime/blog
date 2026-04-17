# Validation Summary: How to Use Array Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse Array data type and array functions
- ARRAY JOIN clause

## Sources Consulted
- ClickHouse official docs — Array data type: https://clickhouse.com/docs/en/sql-reference/data-types/array
- ClickHouse official docs — Array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official docs — ARRAY JOIN clause: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse official docs — Aggregate functions (groupArray): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse official docs — String functions (upper, length): https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found
No technical issues found.

All verified as accurate against the current ClickHouse documentation:
- `Array(T)` column declaration and `[...]` literal syntax
- `arrayLength`, `has`, `hasAny`, `arrayElement` / `arr[n]` with 1-based indexing, `indexOf` (0 if not found), `arraySort`, `arrayReverseSort`, `arrayUniq`
- Higher-order functions `arrayMap`, `arrayFilter`, `arrayReduce('avg', ...)` with aggregate function name as a string
- `ARRAY JOIN` and `LEFT ARRAY JOIN` semantics (LEFT preserves rows with empty arrays)
- `groupArray` aggregate and `arrayFlatten` for one-level flattening
- Nested `Array(Array(T))` with chained subscript `matrix[2][3]`
- `upper(x)` and `length(x)` usage inside lambdas

## Review Notes
- `arrayLength(arr)` is an accepted alias; the primary documented name is `length(arr)`. The post itself shows both forms (using `arrayLength` in one place and `length(arrayFilter(...))` in another), which is consistent with ClickHouse's usage.
- `length(string)` returns byte length; for UTF-8 code-point length, `lengthUTF8` would be used. The post's `length(x) > 5` filter is fine for the ASCII tag examples shown.
- `arrayUniq` returns the count of distinct elements (not the distinct list); the post's `distinct_tag_count` alias correctly reflects this semantics.
- No deprecated syntax or version-specific caveats observed.
