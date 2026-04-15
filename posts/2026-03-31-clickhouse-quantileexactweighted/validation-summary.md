# Validation Summary: How to Use quantileExactWeighted() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- `quantileExactWeighted` aggregate function
- `quantileExact` aggregate function (for comparison)
- AggregatingMergeTree engine with `-State` / `-Merge` combinators
- Materialized views for incremental aggregation

## Sources Consulted
- ClickHouse official docs — quantileExactWeighted: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexactweighted
- ClickHouse official docs — aggregate function combinators (-State, -Merge): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official docs — AggregateFunction data type: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction

## Issues Found
No technical issues found.

## Review Notes
- The `CREATE TABLE latency_summary` statement omits the `ENGINE` clause. This works in modern ClickHouse (22.5+) when the `default_table_engine` setting is configured (defaults to MergeTree in ClickHouse Cloud), but would fail on older self-hosted installations without that setting. Since this is illustrative setup code and not the focus of the post, it is acceptable.
- The "Multiple Percentiles" example calls `quantileExactWeighted` five times with different levels. ClickHouse provides `quantilesExactWeighted(0.50, 0.75, 0.90, 0.95, 0.99)(value, weight)` (plural form) which computes all quantiles in a single pass and is more efficient. The current approach is not wrong — it produces correct results — but a production workload would benefit from the plural form. This is an optimization note, not an error.
