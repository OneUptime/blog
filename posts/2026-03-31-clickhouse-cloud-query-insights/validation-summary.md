# Validation Summary: How to Use ClickHouse Cloud Query Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- ClickHouse Query Insights (observability feature)
- `system.query_log` system table
- ClickHouse SQL functions (`normalizeQuery`, `quantile`, `formatReadableSize`, `countIf`, `toStartOfHour`, `substr`)

## Sources Consulted
- ClickHouse Cloud documentation on Query Insights: https://clickhouse.com/docs/en/cloud/manage/monitor
- ClickHouse `system.query_log` reference: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse SQL function reference: https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse aggregate function reference (quantile): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile

## Issues Found
No technical issues found.

- All referenced `system.query_log` columns (`query`, `query_duration_ms`, `read_bytes`, `event_time`, `type`, `user`, `memory_usage`, `query_id`) are valid.
- `type` enum values used (`QueryFinish`, `ExceptionBeforeStart`, `ExceptionWhileProcessing`) match ClickHouse's documented query log event types.
- SQL function usage (`normalizeQuery`, `quantile(0.99)(...)`, `formatReadableSize`, `countIf`, `toStartOfHour`, `substr`) is syntactically correct.
- `INTERVAL N HOUR` syntax is valid in ClickHouse.

## Review Notes
- The post describes the ClickHouse Cloud Query Insights UI at a high level (navigation path, metrics shown, alerts). The exact UI layout and menu labels in ClickHouse Cloud may evolve over time, so screenshots or exact menu names could become outdated; however, the conceptual description remains accurate.
- `substring(query, 1, 100)` is the more canonical name in ClickHouse docs, but `substr` is a valid alias and works identically.
- Users on self-hosted ClickHouse can run all the SQL examples too; only the UI/console portions are specific to ClickHouse Cloud.
