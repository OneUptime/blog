# Validation Summary: How to Use corrMatrix() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse aggregate functions (corrMatrix, corrMatrixState, corrMatrixMerge)
- AggregatingMergeTree engine
- Materialized Views
- Array functions (arrayEnumerate, arrayJoin, ARRAY JOIN)

## Sources Consulted
- [ClickHouse corrMatrix documentation](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corrmatrix)
- [ClickHouse Array data type documentation](https://clickhouse.com/docs/en/sql-reference/data-types/array) — confirms 1-based indexing
- [ClickHouse AggregateFunction data type documentation](https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction)
- [ClickHouse PR #44680 — adding corrMatrix, covarSampMatrix, covarPopMatrix](https://github.com/ClickHouse/ClickHouse/pull/44680) — confirms function was introduced in v23.2.0
- [Using Aggregate Combinators in ClickHouse](https://clickhouse.com/blog/aggregate-functions-combinators-in-clickhouse-for-arrays-maps-and-states) — confirms -State / -Merge usage pattern

## Issues Found
No technical issues found.

Verified the following claims:
- `corrMatrix(x1, x2, ..., xN)` is variadic and returns `Array(Array(Float64))` — correct.
- Diagonal entries are 1.0 — correct (correlation of a variable with itself).
- Array indexing is 1-based, so `m[1][2]`, `m[1][3]`, `m[2][3]` correctly access the upper triangle pairs — verified via the official Array data type documentation.
- `arrayEnumerate` returns indices starting at 1 — correct, matches how the unpacking query uses them.
- `corrMatrixState`/`corrMatrixMerge` combinators follow the standard ClickHouse aggregate function combinator pattern and work with `AggregateFunction(corrMatrix, Float64, Float64, ...)` types in `AggregatingMergeTree` tables — pattern is correct.
- Standard ClickHouse functions used (`toStartOfMinute`, `toStartOfHour`, `toStartOfWeek`, `toFloat64`, `countIf`, `INTERVAL X HOUR/DAY`) all use correct syntax.

## Review Notes
- The "Comparing Correlation Matrices Across Time Periods" query calls `corrMatrix(latency, cpu, mem)` three times in the SELECT list. This is syntactically valid; ClickHouse may not deduplicate the calls automatically across array subscript expressions. For efficiency, computing it once in a CTE/subquery and indexing the result would be preferable, but the example is not incorrect.
- The basic example uses `metric_time` in the WHERE clause but `timestamp` in `toStartOfMinute()`. This implies the table has both columns (or one is an alias); not technically wrong for an illustrative example, just worth noting.
- The materialized view example assumes `host_metrics` has columns including `error_rate` and `service_name` — these are illustrative schema choices and don't affect correctness of the syntax shown.
- `corrMatrix` was introduced in ClickHouse 23.2.0; users on older versions will need to upgrade. Worth noting for completeness in a future revision.
