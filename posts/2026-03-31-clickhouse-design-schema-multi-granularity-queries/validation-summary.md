# Validation Summary: How to Design a Schema for Multi-Granularity Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree engine
- AggregatingMergeTree engine
- SimpleAggregateFunction
- Materialized Views
- Merge table engine
- TTL expressions
- Time-series rollups / multi-granularity schemas

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- AggregatingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- SimpleAggregateFunction docs: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- Materialized View docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- Merge engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/merge
- TTL for columns and tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- Date/time functions (toStartOfMinute, toStartOfHour, toDate, toDateTime): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
- The `metrics_1h` table definition was described in its comment as having "5-year retention" but had no TTL clause. Added `TTL hour + INTERVAL 5 YEAR;` so the table definition matches the stated retention policy, consistent with the other tiers.

## Review Notes
- `SimpleAggregateFunction(sum/min/max, Float64)` with `count_value SimpleAggregateFunction(sum, UInt64)` is correct: the MV inserts plain aggregates (`sum(value)`, `min(value)`, `max(value)`, `count()`) and the engine merges them appropriately. `count()` returns UInt64 which matches the column type.
- `TTL toDateTime(timestamp) + INTERVAL 30 DAY` is a valid pattern for converting a DateTime64 column to DateTime for TTL use; modern ClickHouse also accepts DateTime64 directly, but the explicit conversion is portable.
- `toStartOfMinute(timestamp)` on a DateTime64(3) column returns DateTime64 in recent ClickHouse versions; insertion into the `minute DateTime` column relies on implicit narrowing. This works but truncates sub-second precision (desired here since it's a per-minute rollup).
- The "MERGE Engine for Transparent Multi-Tier Queries" example is syntactically valid, but `metrics_all AS metrics_raw` inherits `metrics_raw`'s schema (with a `timestamp` column), while `metrics_1m` and `metrics_1h` use `minute`/`hour` columns. The Merge engine only exposes columns present in all underlying tables, so in practice only the common columns (service, metric, and the aggregation columns where they exist) will be queryable across tiers. Readers should be aware that making Merge fully transparent across tiers typically requires a unified column name for the time bucket.
- Consider adding a 1-day rollup tier in a future update, since the introductory bullet list mentions 1-day rollups but the implementation sections only build 1-minute and 1-hour tiers.
