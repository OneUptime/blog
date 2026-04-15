# Validation Summary: How to Use min() and max() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, aggregate functions)
- SQL (DDL, DML, aggregate queries, GROUP BY)
- ClickHouse aggregate functions: min(), max(), minIf(), maxIf(), argMin(), argMax()
- ClickHouse functions: ifNull(), dateDiff(), toDate(), now(), count(), avg()

## Sources Consulted
- ClickHouse official documentation — Aggregate Functions reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/min
- ClickHouse official documentation — Aggregate Functions reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/max
- ClickHouse official documentation — argMin/argMax: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin
- ClickHouse official documentation — Aggregate Function Combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation — dateDiff function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse official documentation — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
No technical issues found.

## Review Notes
- The multiple `argMax()` pattern for reconstructing a "peak row" is correct and idiomatic, though readers should be aware that if there are ties in the key column (e.g., multiple rows with the same max temperature), different `argMax()` calls may return values from different tied rows. This is a known ClickHouse behavior, not an error in the post.
- All SQL examples use correct ClickHouse syntax and would execute successfully against the defined table schema.
- The NULL behavior section correctly uses a `Nullable(Float64)` column to demonstrate NULL handling. The return type of `min()`/`max()` preserves the Nullable wrapper, so the "all NULLs yield NULL" claim is accurate for this column type.
