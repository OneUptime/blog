# Validation Summary: How to Build Correlation Matrices in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- Aggregate functions: `corr`, `corrMatrix`
- Array helpers: `arrayJoin`, `arrayMap`

## Sources Consulted
- [ClickHouse `corr` function docs](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr)
- [ClickHouse `corrMatrix` function docs](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corrmatrix)
- [PR #44680 — add corrMatrix, covarSampMatrix, covarPopMatrix AggregateFunction](https://github.com/ClickHouse/ClickHouse/pull/44680)
- [Issue #44587 — corrMatrix feature request](https://github.com/ClickHouse/ClickHouse/issues/44587)

## Issues Found
- **Incorrect `corrMatrix` invocation syntax.** The post called it as `corrMatrix(['cpu_pct', 'mem_pct', 'disk_io'])(cpu_pct, mem_pct, disk_io)` — a parametric-style call with an array of column name strings. `corrMatrix` is a regular (not parametric) aggregate function that takes numeric column references directly: `corrMatrix(x1, x2, ...)`. Fixed to `corrMatrix(cpu_pct, mem_pct, disk_io)` and added an `arrayJoin`/`arrayMap` example showing the typical way to render the resulting `Array(Array(Float64))` row-by-row.
- **Inaccurate "Experimental" label.** `corrMatrix` was added in ClickHouse 23.2 (PR #44680) and is documented as a standard aggregate function, not experimental. Renamed the section to "Using corrMatrix" and noted the minimum version (23.2+).

## Review Notes
- `corr(x, y)` returning the Pearson correlation coefficient (range -1 to 1) is correct, confirmed in the official docs.
- Worth noting for readers (not added to keep scope minimal): the ClickHouse docs warn that `corr` uses a numerically unstable algorithm; `corrStable` is recommended for more reliable results on large datasets, at the cost of performance.
- The `UNION ALL` matrix pattern is valid but scans the table once per row; for large tables, a single `corrMatrix(...)` call is far more efficient since it makes one pass.
- `HAVING abs(r) > 0.7` correctly filters on the aggregate alias; ClickHouse permits referencing `SELECT` aliases inside `HAVING`.
