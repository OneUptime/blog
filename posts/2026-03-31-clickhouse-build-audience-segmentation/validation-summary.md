# Validation Summary: How to Build Audience Segmentation with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, LowCardinality, Map types)
- ClickHouse SQL (window functions, aggregate functions, skip indexes, parameterized queries)
- Mermaid diagrams

## Sources Consulted
- ClickHouse SQL Reference: https://clickhouse.com/docs/en/sql-reference
- ClickHouse Table Engines / ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse Data Skipping Indexes: https://clickhouse.com/docs/en/optimize/skipping-indexes
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse Date/Time Functions (`dateDiff`, `today`, `now`, `toStartOfMonth`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Aggregate Functions (`uniq`, `countIf`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse Parameterized Queries: https://clickhouse.com/docs/en/interfaces/cli#cli-queries-with-parameters
- ClickHouse `LowCardinality` and `Map` types: https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
No technical issues found.

## Review Notes
- The Active Users segment query combines `SELECT DISTINCT user_id` with `GROUP BY user_id`. The `DISTINCT` is redundant since `GROUP BY` already produces unique rows per group, but it is not incorrect and ClickHouse handles it without error.
- `ReplacingMergeTree(last_active_at)` uses a `DateTime` column as the version, which is supported (versions can be UInt*, Date, or DateTime). Beware that for "latest wins" semantics on user-row updates, callers should use `FINAL` (which the post correctly does in subsequent queries).
- The cohort retention query uses `max(uniq(c.user_id)) OVER (PARTITION BY c.cohort_month)` to denominate retention by the largest count in each cohort. This typically corresponds to month 0; the assumption that the cohort is largest at month 0 is reasonable for retention analysis but worth noting.
- `uniq()` is an approximate distinct count (HyperLogLog-based). For exact counts, `uniqExact()` would be appropriate, but `uniq()` is the conventional choice for large-scale analytics where small approximation error is acceptable.
- The set-type skip index `TYPE set(100) GRANULARITY 4` is valid; with `LowCardinality(String)` event_type the cardinality cap of 100 is generous.
- Parameterized query placeholders (`{lookback_days:UInt32}`, etc.) follow the standard ClickHouse client/HTTP parameter syntax.
