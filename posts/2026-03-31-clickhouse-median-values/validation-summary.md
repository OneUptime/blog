# Validation Summary: How to Calculate Median Values in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, aggregate functions, window functions)
- ClickHouse quantile function family: `median`, `quantile`, `quantileExact`, `medianExact`, `quantileExactWeighted`

## Sources Consulted
- ClickHouse documentation on quantile functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse documentation on quantileExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse documentation on quantileExactWeighted: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexactweighted
- ClickHouse documentation on median (alias): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/median
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
- **Incorrect algorithm attribution for `median()` and `quantile()`**: The post stated that `median` and `quantile(0.5)` use the "T-Digest" algorithm. This is incorrect. ClickHouse's `quantile()` (and its alias `median()`) uses **reservoir sampling** with a reservoir size up to 8192. T-Digest is a separate algorithm available via the `quantileTDigest()` function. Fixed the two SQL comments on lines 32 and 35 to say "reservoir sampling" instead of "T-Digest".

## Review Notes
- All SQL syntax is correct and uses valid ClickHouse functions and date arithmetic (`today() - 1`, `now() - INTERVAL 24 HOUR`, `toStartOfHour()`, `toDate()`).
- `medianExact()` is correctly used as an alias for `quantileExact(0.5)`.
- `quantileExactWeighted()` syntax with two arguments (value, weight) is correct.
- The window function usage of `median()` with `OVER` clause works in ClickHouse versions 21.11+ where aggregate functions are supported in window contexts. The post does not specify a minimum version, which is acceptable for a general tutorial.
- The guidance about using `quantileExact` for datasets under ~10 million rows and `median`/`quantile` for billions of rows is a reasonable rule of thumb, though the actual threshold depends on available memory.
- The `HAVING` clause referencing a column alias (`mean_to_median_ratio`) is valid in ClickHouse, unlike standard SQL which would require repeating the expression.
