# Validation Summary: How to Use quantileTiming() in ClickHouse for Latency

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate functions: `quantileTiming()`, `quantilesTiming()`, `quantileTimingWeighted()`, `quantile()`, `quantileTDigest()`
- ClickHouse combinators: `-State`, `-Merge`
- AggregatingMergeTree engine
- Materialized Views

## Sources Consulted
- ClickHouse official documentation for quantileTiming: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletiming
- ClickHouse official documentation for quantileTimingWeighted: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletimingweighted
- ClickHouse official documentation for quantilesTiming: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantilestiming
- ClickHouse source code (QuantileTiming.h) for internal bucket resolution details
- ClickHouse official documentation for aggregate function combinators (-State, -Merge)

## Issues Found
1. **Off-by-one in granularity range**: The post stated "1ms steps for values 0 to 1024ms" but the source code shows the 1ms-step buckets cover values 0 through 1023. The value 1024 falls into the 16ms-step range. Fixed to "0 to 1023ms".
2. **Misleading clamping description**: The post stated "Values outside this range are clamped," implying both ends of the range. In reality, only values above 30,000ms are clamped to 30,000. Negative values produce undefined behavior, not clamping. Fixed to clarify that only the upper bound is clamped and negative values have undefined behavior.

## Review Notes
- The claim that `quantileTiming()` is "the fastest and most memory-efficient" quantile function is directionally correct for its target domain (latency data in 0–30,000ms) and supported by the official docs stating it is "more effective and accurate than quantile" for page loading times. However, it is presented as an absolute rather than qualified statement. This is acceptable for a blog post but worth noting.
- All SQL syntax is correct, including the double-parentheses parametric syntax, the `quantilesTiming()` plural variant, and the State/Merge combinator usage in the materialized view pattern.
- The return type claim of `Array(Float32)` for `quantilesTiming()` is accurate.
- The materialized view pattern using `AggregatingMergeTree` with `-State`/`-Merge` combinators is a standard and correct ClickHouse pattern.
