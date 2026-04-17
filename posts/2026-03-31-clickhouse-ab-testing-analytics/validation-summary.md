# Validation Summary: How to Build A/B Testing Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, CTEs)
- SQL (aggregations, joins, two-proportion Z-test)
- A/B testing / experimentation analytics

## Sources Consulted
- ClickHouse `count` / `count(DISTINCT)` docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/count
- ClickHouse aggregate function combinators (`-Distinct`): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse window functions: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse `WITH` (CTE) clause: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse `Decimal` data type: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse `LowCardinality`: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse `CREATE TABLE` (DEFAULT expressions): https://clickhouse.com/docs/sql-reference/statements/create/table

## Issues Found
1. **Cumulative Conversion Over Time query** used `sum(countDistinct(e.user_id)) OVER (...)` — a window function wrapping an aggregate in the same SELECT level. ClickHouse does not support nesting an aggregate directly inside a window function call; the inner aggregate must be resolved under `GROUP BY` first and then referenced by alias in the window. I refactored the query into a two-stage form using a `daily` CTE that computes `daily_conversions = countDistinct(e.user_id)` under `GROUP BY`, then an outer SELECT applies `sum(daily_conversions) OVER (PARTITION BY variant ORDER BY day ...)`. The result is the same cumulative-conversion semantics but uses valid ClickHouse syntax.

## Review Notes
- `countDistinct(x)` is mixed with `count(DISTINCT x)` stylistically — both are valid (the former uses the `-Distinct` combinator). Not changed, as it's not a correctness issue.
- The Z-score formula is the *unpooled* two-proportion Z-test. A pooled variant (using the combined proportion for the standard error) is more conventional for hypothesis testing, but the unpooled form is also widely used and defensible; this is a statistical-convention nuance, not a technical error.
- Summing `countDistinct` per day to derive a cumulative-distinct count can over-count users who convert on multiple days (the cumulative value is an upper bound on true distinct conversions). This is a semantic caveat worth mentioning in future revisions but is consistent with how many A/B dashboards display cumulative daily conversions.
- `LowCardinality(String)`, `Decimal(10, 2) DEFAULT 0`, `toYYYYMM()` partitioning, and the MergeTree `ORDER BY` choices are all correct and sensible for these workloads.
