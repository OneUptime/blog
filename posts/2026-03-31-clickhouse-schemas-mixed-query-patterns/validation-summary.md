# Validation Summary: How to Design Schemas for Mixed Query Patterns in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family, projections, materialized views, TTL-based storage tiering)
- SQL (ClickHouse SQL dialect)
- SummingMergeTree engine
- ClickHouse system tables (system.query_log)

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse Projections documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/projection
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse Other Functions (normalizeQuery): https://clickhouse.com/docs/en/sql-reference/functions/other-functions

## Issues Found
1. **Monitoring query: invalid `table` column reference** — The "Monitoring Which Projections Are Used" query referenced a column `table` (singular) which does not exist in `system.query_log`. The correct column is `tables` (Array(LowCardinality(String))).
2. **Monitoring query: invalid `ARRAY JOIN` on String column** — The same query used `ARRAY JOIN projections AS projection_name`, but the `projections` column in `system.query_log` is of type `String`, not `Array(String)`. `ARRAY JOIN` is only valid on array-typed columns, so this would produce a runtime error.
3. **Fix applied:** Rewrote the monitoring query to select `projections AS projection_name` directly, filter with `projections != ''` to only show queries that used projections, and group by the projection name. Removed the invalid `table` column and `ARRAY JOIN`.

## Review Notes
- All other SQL examples (CREATE TABLE with projections, SummingMergeTree with tuple syntax, materialized view TO syntax, ALTER TABLE MODIFY TTL, ALTER TABLE MODIFY SETTING) are syntactically correct and use current ClickHouse features.
- The `normalizeQuery()` function and `query_duration_ms` column in system.query_log are both valid.
- The post's pedagogical flow shifts from a pure time-range query (Query type A) to an event_type + time_range query in the final schema, which is a reasonable design compromise but could be noted more explicitly. This is a style observation, not a technical error.
- Storage policy names (`hot_cold`) and disk names (`cold_disk`, `s3_disk`) are example names that require server-level configuration — the post correctly frames these as illustrative.
