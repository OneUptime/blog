# Validation Summary: How to Use ClickHouse Materialized Views for Real-Time Aggregations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Incremental materialized views
- MergeTree table engines
- AggregatingMergeTree
- SummingMergeTree
- ReplacingMergeTree
- AggregateFunction state and merge combinators
- ClickHouse system tables

## Sources Consulted
- ClickHouse CREATE VIEW documentation: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse incremental materialized view documentation: https://clickhouse.com/docs/materialized-view/incremental-materialized-view
- ClickHouse cascading materialized views documentation: https://clickhouse.com/docs/guides/developer/cascading-materialized-views
- ClickHouse materialized view rollup knowledge base: https://clickhouse.com/docs/knowledgebase/materialized-view-rollup-timeseries
- ClickHouse AggregateFunction data type documentation: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse aggregate function combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.tables documentation: https://clickhouse.com/docs/operations/system-tables/tables

## Issues Found
- The first aggregation example used `SummingMergeTree` with a finalized `uniq(user_id)` value. That can overcount unique users across insert blocks because ClickHouse materialized views aggregate each inserted block independently. Changed the target to `AggregatingMergeTree`, stored `AggregateFunction` states, used `countState`, `uniqState`, and `sumState`, and updated the query to use `countMerge`, `uniqMerge`, and `sumMerge`.
- The backfill example inserted finalized aggregate values into the corrected aggregate-state target table. Updated it to insert `-State` values that match the `AggregateFunction` columns.
- The `POPULATE` example used `CREATE MATERIALIZED VIEW ... TO events_hourly POPULATE`, which ClickHouse does not allow. Rewrote it as a materialized view with its own `ENGINE` and added a warning that `POPULATE` cannot be used with `TO`, is not supported in ClickHouse Cloud, and can miss concurrent inserts.
- Several `AggregateFunction(count, UInt64)` examples did not match the current documented `countState()` pattern. Updated count state columns to `AggregateFunction(count)`.
- The dashboard metrics example declared `error_count` as `countIf` state but queried it with `countMerge`. Replaced it with `sumState(toUInt64(status_code >= 500))` and `sumMerge(error_count)` to keep the state and merge functions consistent.
- The funnel example used `ReplacingMergeTree` for boolean progress flags. That can discard previously reached steps when different steps arrive in different insert blocks. Changed it to `AggregatingMergeTree` with `maxState` columns and a query that finalizes with `maxMerge`.
- The ReplacingMergeTree latest-state explanation implied immediate deduplication. Clarified that replacement occurs during background merges and `FINAL` is needed when querying before merges complete.
- The retention example referenced `first_seen` without showing where it comes from. Added a comment that the source `events` table must include a `first_seen DateTime` column.
- The `system.query_log` example used nonexistent `duration_ms` and scalar `table` columns. Updated it to use documented `query_duration_ms` and the `tables` array.
- The `system.tables` status query selected a nonexistent `table` column. Updated it to use documented `name`, `target_table`, and `dependencies_table`.
- The insert failure example used unsupported materialized view `SETTINGS` syntax and settings that do not address view failure semantics. Replaced it with an insert retry pattern using `insert_deduplicate` and `deduplicate_blocks_in_dependent_materialized_views`.

## Review Notes
No local ClickHouse binary was available in the workspace, so SQL examples were reviewed against official ClickHouse documentation rather than executed locally. The multi-level aggregation example remains intentionally abbreviated with `CREATE TABLE ...` placeholders, so it should be treated as a pattern sketch rather than directly runnable SQL.
