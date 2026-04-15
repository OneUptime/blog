# Validation Summary: How to Calculate Weighted Averages in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions, window functions)
- `avgWeighted` aggregate function
- ClickHouse date/time functions (`today()`, `now()`, `INTERVAL`)
- ClickHouse type conversion functions (`toFloat64`, `round`)
- Window functions with frame specifications (`ROWS BETWEEN ... AND ...`)

## Sources Consulted
- avgWeighted official documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/avgweighted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse GitHub Issue #34552 confirming avgWeighted formula equivalence: https://github.com/ClickHouse/ClickHouse/issues/34552
- Altinity blog on ClickHouse window functions (confirms avgWeighted window support): https://altinity.com/blog/clickhouse-window-functions-current-state-of-the-art

## Issues Found
No technical issues found.

## Review Notes
- The `avgWeighted` function returns `NaN` (not an error) when all weights are zero. The post's "Handling Zero Weights" section correctly demonstrates a manual guard using `if(sum(weight) > 0, ..., NULL)` to return NULL instead, which is a practical pattern for downstream consumers that may not handle NaN well.
- The `avgWeighted` function accepts `(U)Int*` or `Float*` types for both arguments. The examples use plausible column names that would typically be numeric, so this is fine.
- ClickHouse documentation states "all aggregate functions are supported" as window functions, so the `avgWeighted(...) OVER (...)` example is valid.
