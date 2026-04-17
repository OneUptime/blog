# Validation Summary: How to Calculate Pearson Correlation Coefficient in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse aggregate functions: `corr()`, `corrMatrix()`
- ClickHouse time functions: `toStartOfHour()`, `toStartOfWeek()`
- ClickHouse conditional aggregation: `countIf()`
- Pearson correlation coefficient (statistics)
- t-statistic for testing correlation significance

## Sources Consulted
- ClickHouse `corr` aggregate function docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corr
- ClickHouse `corrMatrix` aggregate function docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/corrmatrix
- ClickHouse `countIf` combinator docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Standard statistics references for Pearson r and t-statistic for r (t = r * sqrt(n-2) / sqrt(1 - r^2))

## Issues Found
- **Incorrect `corrMatrix` syntax**: The post originally used `corrMatrix(3)(cpu, memory, latency)`, a parametric-aggregate style invocation. ClickHouse's `corrMatrix` is a plain variadic aggregate and does not take an arity parameter. Per official docs the correct invocation is `corrMatrix(col1, col2, ..., colN)`. Fixed the example to `corrMatrix(cpu, memory, latency)`.

## Review Notes
- `corr(x, y)` in ClickHouse computes Pearson correlation and returns `Float64`. The docs note this uses a numerically unstable algorithm; `corrStable(x, y)` exists as a slower but numerically stable alternative. The post does not mention `corrStable`, which is not an error but could be useful context for readers computing correlations on very small or near-constant series.
- The t-statistic formula `r * sqrt(n-2) / sqrt(1 - r^2)` is the standard Student's t-statistic for testing H0: r = 0, and is correctly written.
- Interpretation-strength thresholds (|r| >= 0.9, 0.7, 0.5, 0.3) are conventional rules of thumb and consistent with common usage.
- Queries assume example tables (`http_requests`, `system_metrics`, `hourly_metrics`) with the named columns; these are illustrative and not part of ClickHouse itself.
