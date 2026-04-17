# Validation Summary: How to Build a Web Analytics System with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, skip indexes)
- SQL (DDL, DML, CTEs, window-free aggregations)
- Web analytics concepts (sessions, funnels, retention, traffic sources)
- Architecture diagrams (Mermaid)

## Sources Consulted
- ClickHouse official docs — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — Data skipping indexes (bloom_filter): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse docs — Date/Time functions (today, now, toDate, toMonday, toStartOfFiveMinutes, dateDiff, INTERVAL): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs — Aggregate functions (uniq, count, countIf, avg): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse docs — Data types (DateTime64, LowCardinality, UUID): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse docs — generateUUIDv4: https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions

## Issues Found
1. **Traffic Sources query mislabels page-view count as "sessions"** — The original query used `count() AS sessions`, which counts rows (page_view events), not sessions. Fixed to `uniq(session_id) AS sessions` so the column actually reflects the number of distinct sessions per traffic source. This aligns with the column name and common web-analytics semantics (source → unique sessions).

## Review Notes
- All ClickHouse functions and DDL verified against current official documentation. `generateUUIDv4()`, `LowCardinality(String)`, `DateTime64(3)`, `bloom_filter(0.01)` skip index, `toMonday`, `toStartOfFiveMinutes`, `dateDiff`, `countIf`, `uniq`, and `INTERVAL 30 MINUTE` are all valid and non-deprecated.
- Minor optimization note (not fixed, since functionally correct): comparing `DateTime64` with `today() - 30` implicitly converts the `Date` to midnight UTC. It works, but for tighter partition/primary-key pruning on a `DateTime64` column, wrapping with `toDateTime64(today() - 30, 3)` or filtering via `toDate(viewed_at)` can be preferable in hot query paths.
- `uniq()` is HyperLogLog-based and approximate. For reporting that requires exact counts (e.g., billing, compliance), `uniqExact()` is more appropriate. The post's use of `uniq()` is reasonable for analytics dashboards.
- Retention query is correct but produces rows for all weeks including the cohort week itself (weeks_since_first = 0). This is expected behavior for cohort retention charts.
- Architecture and Mermaid diagrams are accurate and render correctly.
