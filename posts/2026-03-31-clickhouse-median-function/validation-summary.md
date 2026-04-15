# Validation Summary: How to Use median() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL
- `median()` / `quantile(0.5)` — approximate median via reservoir sampling
- `medianExact()` / `quantileExact()` — exact median via partial sort
- `medianTDigest()` / `quantileTDigest()` — approximate median via t-digest algorithm
- `medianExactWeighted()` / `quantileExactWeighted()` — exact weighted median

## Sources Consulted
- ClickHouse official docs — median: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/median
- ClickHouse official docs — quantile: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official docs — quantileExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse official docs — quantileTDigest: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest
- ClickHouse official docs — quantileExactWeighted: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexactweighted

## Issues Found
1. **medianExact() described as "sorts all values"** — The post stated that `medianExact()` "sorts all values and returns the true median." The ClickHouse documentation for `quantileExact()` states that it "combines all the passed values into an array, which is then **partially sorted**." A partial sort (equivalent to `std::nth_element`) is sufficient to find the exact median without a full sort. Changed three occurrences of "sorts all values" to "partially sorts all values" to match the documented behavior.

## Review Notes
- All SQL syntax in the post is correct and uses valid ClickHouse function signatures.
- The claim that `median()` is an alias for `quantile(0.5)` is confirmed by official docs.
- The non-deterministic nature of `median()` / `quantile()` is correctly noted; the docs explicitly state "the result is non-deterministic."
- The `medianExactWeighted(value, weight)` syntax is correct per the docs.
- The characterization that `medianTDigest()` is more accurate than `median()` for p50 is a fair claim, supported by t-digest's documented superior precision-to-state-size ratio and the fact that reservoir sampling is limited to 8192 elements.
- The performance guidance (use `medianExact()` for bounded datasets, `median()`/`medianTDigest()` for large scans) is reasonable and aligns with the documented trade-offs.
