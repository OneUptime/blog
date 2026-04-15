# Validation Summary: How to Calculate User Retention Rates in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions)
- ClickHouse `retention` parametric aggregate function
- Cohort analysis / user retention analytics

## Sources Consulted
- ClickHouse official documentation — Parametric Aggregate Functions (`retention`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions#retention
- ClickHouse official documentation — Array data type and 1-based indexing: https://clickhouse.com/docs/en/sql-reference/data-types/array
- ClickHouse official documentation — Date arithmetic and INTERVAL syntax: https://clickhouse.com/docs/en/sql-reference/data-types/date

## Issues Found

1. **Incorrect alias `week_4` (line 25)**: The 4th retention condition checks the interval from day 21 to day 28, which is week 3 (0-indexed: week 0, 1, 2, 3). The alias `week_4` was changed to `week_3`.

2. **Inaccurate description of `retention` return type (line 17)**: The post described the return value as a "bitmap." The ClickHouse `retention` function returns an `Array(UInt8)` of 0s and 1s, not a bitmap. Changed "returns a bitmap" to "returns an array."

3. **Redundant BETWEEN with identical bounds (line 64)**: `BETWEEN c.cohort_day + 7 AND c.cohort_day + 7` is equivalent to `= c.cohort_day + 7`. Simplified to use `=` for clarity and consistency with the adjacent day-1 and day-30 conditions.

4. **Broken "Retention by Segment" query (lines 94-101)**: The original query attempted `JOIN users USING user_id` on `retention_results`, but the Day-N retention query groups by `cohort_day` and produces aggregate columns — it has no `user_id` column. The JOIN would fail. Rewrote the query to compute retention by acquisition channel from scratch: build cohorts, join with the `users` table at the user level, left-join activity, and aggregate by `acquisition_channel`.

## Review Notes
- The Day-N retention query joins the `activity` CTE three times (as a1, a7, a30), which creates a cross-product that is correct but inefficient. A single join with conditional aggregation would be more performant. This was not changed since it is functionally correct.
- The "Retention Percentages" section references a `retention_results` table that is assumed to exist from a prior step. This is a reasonable abstraction for a blog post but readers should understand they need to materialize the Day-N query results first.
- ClickHouse division of integers produces Float64 (unlike many SQL databases), so the percentage calculations in the Retention Percentages section work correctly without explicit casting.
