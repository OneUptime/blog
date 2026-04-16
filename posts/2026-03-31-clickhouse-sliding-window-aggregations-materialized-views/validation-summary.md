# Validation Summary: How to Build Sliding Window Aggregations with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SummingMergeTree engine, materialized views, window functions)
- SQL (RANGE and ROWS window frame specifications, CTEs)
- Time series pre-aggregation patterns

## Sources Consulted
- ClickHouse documentation on SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation on SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view

## Issues Found
1. **`value_max` column incorrectly typed as plain `Float64` in a `SummingMergeTree` table.** SummingMergeTree sums all numeric columns not in the ORDER BY key during background merges. This means `value_max` would be summed (sum-of-maxes) instead of correctly retaining the maximum (max-of-maxes) when multiple insert batches produce rows with the same `(bucket_time, metric_name, service)` key. **Fix:** Changed `value_max Float64` to `value_max SimpleAggregateFunction(max, Float64)`. SummingMergeTree respects `SimpleAggregateFunction` columns and applies the declared aggregate function (`max`) instead of summing. The materialized view's `max(value) AS value_max` is compatible with this column type — ClickHouse handles the implicit conversion.

## Review Notes
- The `today() - 60` syntax in the 7-day rolling average query is valid ClickHouse (subtracting an integer from a Date subtracts that many days) but `today() - INTERVAL 60 DAY` would be more self-documenting. Not changed since it is technically correct.
- The Rate of Change Detection query's GROUP BY on `current_window, previous_window` is unconventional — since these are per-row window function outputs, the grouping mostly acts as a pass-through. It works correctly but could confuse readers. Not changed since it produces correct results.
- The `RANGE BETWEEN INTERVAL 4 MINUTE PRECEDING AND CURRENT ROW` syntax is correct for ClickHouse window functions with a DateTime ORDER BY column and correctly defines a 5-minute sliding window (current row's minute + 4 preceding minutes).
