# Validation Summary: How to Build Trial-to-Paid Conversion Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide (ClickHouse SQL recipes for product/growth analytics)

## Technologies Covered
- ClickHouse (MergeTree engine, aggregate functions, CTEs, parametric aggregates)
- SQL (analytical queries for SaaS funnel analysis)

## Sources Consulted
- ClickHouse aggregate function combinators (-If): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse CTE / WITH clause: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse SQL syntax (alias rules): https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse date/time functions (`toYYYYMMDD`, `toStartOfWeek`, `dateDiff`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse `quantile` aggregate: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse custom partitioning key: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found

1. **"Overall Conversion Rate" query — alias shadowing column name.** The query aliased `uniqExactIf(account_id, converted = 1) AS converted`, colliding with the `converted` column. ClickHouse's SQL syntax docs explicitly warn against this pattern ("sum(b) AS b breaks argMax(a, b)") because aliases shadow columns globally by default. While the query happened to produce the intended result here (the alias was consumed in a later SELECT expression, not in a context that needed the column), this is a documented footgun. Renamed the alias to `converted_accounts` for clarity and safety.

2. **"Time to Convert from Trial Start" CTE — broken `HAVING` filter.** The CTE used `HAVING converted_at IS NOT NULL` to filter to accounts that converted, relying on `minIf(ts, converted = 1)` returning NULL when no rows matched. This is incorrect: per the ClickHouse combinators docs, `-If` returns the type's default value when no rows match — for `DateTime` that is `1970-01-01 00:00:00`, not NULL. The filter would therefore fail to exclude never-converted accounts, polluting the median/p90 calculation with zero-epoch timestamps and wildly inflating the results. Replaced with `HAVING max(converted) = 1`, which correctly keeps only accounts that have at least one converted event.

## Review Notes

- `PARTITION BY toYYYYMMDD(ts)` is valid and `toYYYYMMDD` exists, but daily partitioning can generate a very large number of partitions on high-cardinality data. The ClickHouse custom-partitioning-key docs recommend reserving daily partitioning for observability/log-style use cases. Monthly partitioning (`toYYYYMM(ts)`) is typically more appropriate for business analytics data like trial events. Leaving as-is since it is the author's design choice and not technically incorrect.
- The "Feature Usage Correlation" query computes the share of `use` events per feature that came from converted accounts. This is a reasonable correlation proxy but is sensitive to event-volume skew (power users generating many events can dominate). A per-account lift metric would be more rigorous, but this is an analytical modeling choice, not a correctness issue.
- The schema stores `converted` as a denormalized flag on every event row. This implies a rewrite/backfill step when an account converts (e.g., via `ALTER TABLE ... UPDATE` or a replacing table), which the post does not cover. Worth noting for readers building this in practice.
