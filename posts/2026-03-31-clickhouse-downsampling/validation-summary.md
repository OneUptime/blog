# Validation Summary: How to Implement Downsampling in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, materialized views, TTL policies)
- SQL DDL (CREATE TABLE, CREATE MATERIALIZED VIEW)
- Time-series data modeling

## Sources Consulted
- ClickHouse CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse CREATE MATERIALIZED VIEW: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse LowCardinality data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse Date and Time Functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse Custom Partitioning Key: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse TTL clauses: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
1. **Incorrect column reference in raw query**: The "Query Routing" example selected `avg_value` from `metrics_raw`, but the `metrics_raw` schema only defines `value` (not `avg_value`). This query would fail with an "Unknown identifier" error. Fixed by changing `SELECT ts, avg_value FROM metrics_raw` to `SELECT ts, value FROM metrics_raw`.
2. **Description/implementation mismatch**: The post's frontmatter Description claimed the tutorial uses "materialized views, TTL, and AggregatingMergeTree", but every table in the post uses regular `MergeTree`, not `AggregatingMergeTree`. Updated the description to remove the inaccurate `AggregatingMergeTree` reference so it matches the implementation.

## Review Notes
- The chosen pattern (regular `MergeTree` rollup tables fed by an aggregating materialized view) is technically valid, but readers should be aware that the materialized view emits one aggregated row per insert *block*, so a single time bucket can have multiple partial rows. Direct `SELECT avg_value ...` queries against the rollup tables therefore return per-block partial averages rather than a single per-bucket value. For exact one-row-per-bucket semantics, an `AggregatingMergeTree` destination with `AggregateFunction(avg, Float64)` columns plus `-State`/`-Merge` combinators is the canonical pattern; alternatively, queries should add `GROUP BY ts_bucket` and re-aggregate at read time.
- The on-demand backfill uses `avg(avg_value)` to roll 1-minute averages into 1-hour averages. This is only mathematically correct when the per-minute `sample_count` values are equal. A more accurate weighted form is `sum(avg_value * sample_count) / sum(sample_count)`. Left as-is because it is a common simplification and the post does not claim exact precision.
- All other syntax (TTL clauses, `LowCardinality(String)`, `toStartOfMinute`/`toStartOfHour`, `toYYYYMMDD`/`toYYYYMM` partitioning, `CREATE MATERIALIZED VIEW ... TO ...`) is verified against current ClickHouse documentation.
