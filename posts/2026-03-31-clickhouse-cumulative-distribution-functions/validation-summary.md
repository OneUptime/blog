# Validation Summary: How to Implement Cumulative Distribution Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse (SQL, window functions, aggregate functions)
- Quantile / percentile computation
- t-digest and Greenwald-Khanna approximate quantile algorithms

## Sources Consulted
- ClickHouse quantiles reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse aggregate function reference index: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `quantileTDigest`, `quantileGK`, `countIf`, `intDiv` documentation

## Issues Found
- The post referenced `quantileApprox` as a memory-efficient approximate quantile function. This function does not exist in ClickHouse. The real approximate quantile functions are `quantile` (default reservoir sampling), `quantileTDigest`, `quantileGK` (Greenwald-Khanna), `quantileBFloat16`, `quantileDD`, and the timing variants. I replaced `quantileApprox` with `quantileGK`, which is a genuine approximate quantile function suitable for large datasets and is closely analogous to the intent the author described.

## Review Notes
- The `ROWS UNBOUNDED PRECEDING` shorthand is valid ClickHouse syntax (equivalent to `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`).
- The `sum(count()) OVER (...)` pattern alongside `GROUP BY` is a supported ClickHouse idiom: window functions are applied after grouping, so the inner `count()` resolves to the per-group aggregate.
- `quantile(level)(column)`, `quantiles(levels...)(column)`, `countIf`, and `intDiv` are all correctly used.
- Minor stylistic note (not changed): `quantile` in ClickHouse is itself approximate (reservoir sampling), so the distinction in "Sampling for Large Datasets" is more about memory/accuracy tradeoffs than exact-vs-approximate. Left the author's wording intact.
