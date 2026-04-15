# Validation Summary: How to Track Transaction Patterns for AML in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, aggregate combinators)
- Anti-Money Laundering (AML) analytics concepts (velocity checks, structuring/smurfing detection, layering detection)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine, PARTITION BY, ORDER BY — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Decimal types — https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse documentation: LowCardinality — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: Aggregate function combinators (sumIf, countIf) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation: Window functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- SQL standard execution order (FROM > WHERE > GROUP BY > HAVING > Window Functions > SELECT > ORDER BY)

## Issues Found
1. **Running Balance Anomaly query: HAVING clause references window function result** — The original query used `HAVING spike_ratio > 5` where `spike_ratio` depends on `avg_7d_outflow`, which is computed by a window function. In SQL execution order, HAVING is evaluated before window functions, so this would fail or produce incorrect results. Fixed by wrapping the aggregation and window function in a subquery and filtering with a WHERE clause on the outer query.

2. **Running Balance Anomaly query: potential division by zero** — `outflow / avg_7d_outflow` could divide by zero when an account has no outflow in the preceding 6 days (e.g., new accounts or inactive periods). Fixed by adding `WHERE avg_7d_outflow > 0` in the outer query.

## Review Notes
- The self-join in the Layering Detection query could be expensive on very large datasets since it joins transactions against itself. In production, adding tighter date bounds on both sides or using a subquery to pre-filter would improve performance, but the query is correct as written for a tutorial.
- Window function support in ClickHouse has been available since version 21.1 and has matured significantly in later versions. The post does not mention version requirements, which is acceptable for a general tutorial.
- The `countIf` and `sumIf` aggregate combinators are ClickHouse-specific features correctly used throughout the post.
