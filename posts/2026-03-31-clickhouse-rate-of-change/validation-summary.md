# Validation Summary: How to Calculate Rate of Change in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (window functions, time-series analytics)
- SQL (aggregation, subqueries, window expressions)

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on `lagInFrame`: https://clickhouse.com/docs/en/sql-reference/window-functions#lagInFrame
- ClickHouse documentation on `lag` vs `lagInFrame` behavior and frame specifications

## Issues Found

1. **`lag()` used instead of `lagInFrame()`**: The post used `lag()` throughout most examples. While ClickHouse does support `lag()` as a standard window function, its default frame behavior differs from `lagInFrame()`. The post inconsistently mixed `lag()` and `lagInFrame()` (using `lagInFrame()` only in the YoY example). Standardized all examples to use `lagInFrame()` with explicit frame clauses where needed (e.g., `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`) for correct offset lookups beyond the default frame.

2. **Duplicate columns in first example**: The "Simple Period-over-Period Change" query had two identical computed columns (`daily_change` and `abs_delta`) using the exact same expression. The `abs_delta` column was changed to use `abs()` to compute the absolute value of the delta, making it functionally distinct and matching its name.

3. **Nested window functions in Acceleration query**: The original acceleration query nested `lag()` calls inside another `lag()` — e.g., `lag(revenue - lag(revenue, 1) OVER (...), 1) OVER (...)`. ClickHouse does not support nested window function calls in a single SELECT level. Restructured the query to compute velocity in a subquery first, then apply `lagInFrame()` to the velocity column in the outer query.

4. **Aggregate function nested inside window function in YoY query**: The original YoY query used `lagInFrame(sum(revenue), 12) OVER (...)` directly in the same SELECT that performed `GROUP BY`. This nests an aggregate inside a window function at the same query level, which is not valid. Moved the aggregation into a subquery and applied the window function in the outer SELECT.

## Review Notes
- The `lagInFrame()` function's default frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which means lookups for rows *after* the current row would return the default value (0 or NULL). For offset-based lookups like lag with offset > 0 (looking backward), the default frame is sufficient. However, for cases where the offset might need to see beyond the current row or where `UNBOUNDED FOLLOWING` is specified, the explicit frame clause `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` is used to ensure all rows are accessible. The percentage change and WoW/YoY examples use the explicit frame because the default value parameter and large offsets benefit from having the full partition visible.
- The Week-over-Week example assumes contiguous daily data (no gaps). If days are missing, the lag offset of 7 would not correspond to the same weekday. A note about this assumption could be helpful in a future revision.
