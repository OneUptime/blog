# Validation Summary: How to Use stddevSamp() and stddevPop() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate functions (stddevSamp, stddevPop, varSamp, avg, count)
- Window functions (OVER, PARTITION BY, RANGE)
- AggregatingMergeTree engine
- Aggregate function combinators (-State, -Merge)
- Materialized views

## Sources Consulted
- ClickHouse stddevSamp documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/stddevsamp
- ClickHouse stddevPop documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse varSamp documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/varSamp
- ClickHouse varPop documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/varPop
- ClickHouse window functions documentation: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse AggregateFunction data type documentation: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction

## Issues Found
1. **Incorrect RANGE BETWEEN INTERVAL syntax in window function** (Window Function Usage section): The query used `RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW`, but ClickHouse does not support the `INTERVAL` keyword in RANGE frame specifications for window functions. For DateTime columns, numeric offsets in seconds must be used instead. Changed to `RANGE BETWEEN 3600 PRECEDING AND CURRENT ROW` (3600 seconds = 1 hour).

## Review Notes
- The post correctly describes the mathematical relationship between standard deviation and variance (stddev = sqrt(variance)).
- Bessel's correction (N-1 vs N denominator) is accurately explained for stddevSamp vs stddevPop.
- The confidence interval formula (mean +/- 1.96 * stddev / sqrt(n)) is mathematically correct for 95% CI under normal distribution assumptions. The post appropriately qualifies this as "approximate."
- The AggregatingMergeTree pattern with stddevSampState/stddevSampMerge combinators is correctly structured.
- The AggregateFunction(stddevSamp, Float64) type declaration follows correct syntax.
- Worth noting for readers: stddevSamp returns NaN (not NULL) when applied to a single value (n=1), due to division by zero from Bessel's correction. This edge case is not mentioned in the post but could matter in production queries with small partitions.
- ClickHouse also provides numerically stable variants (stddevSampStable, stddevPopStable) which trade performance for stability on large datasets with extreme values. The post does not mention these, which is acceptable for an introductory tutorial.
