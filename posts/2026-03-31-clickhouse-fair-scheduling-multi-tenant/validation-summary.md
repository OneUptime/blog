# Validation Summary: How to Implement Fair Scheduling in Multi-Tenant ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse workload scheduling (CREATE WORKLOAD, PARENT, weights, priorities)
- ClickHouse settings profiles (CREATE SETTINGS PROFILE)
- ClickHouse user management (CREATE USER)
- `system.query_log` for monitoring per-tenant resource usage
- SQL window functions and CTEs for fairness analysis

## Sources Consulted
- ClickHouse Workload Scheduling docs: https://clickhouse.com/docs/operations/workload-scheduling
- ClickHouse CREATE WORKLOAD statement: https://clickhouse.com/docs/sql-reference/statements/create/workload
- ClickHouse CREATE SETTINGS PROFILE: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log

## Issues Found
- **`max_io_bandwidth` is not a valid workload setting.** The correct setting name is `max_bytes_per_second` (byte read/write rate limit). Fixed the root workload example to use `max_bytes_per_second = 2147483648`. The value and comment ("2 GB/s") remain accurate.

## Review Notes
- `weight`, `priority`, `max_concurrent_queries` used in the examples are all valid CREATE WORKLOAD settings.
- The `workload` setting is valid within a `SETTINGS PROFILE`, allowing queries from a user to be routed to a given workload.
- `system.query_log.Settings` is a `Map(String, String)`, so `Settings['workload']` correctly retrieves the workload the query ran under.
- `priority = 0` is higher priority than `priority = 5` in ClickHouse (lower numeric value = higher precedence), which matches the interactive-vs-batch intent in the post.
- The weight values (60/30/10) are proportional; ClickHouse normalizes sibling weights so any positive numeric scheme works.
- Future caveat: workload scheduling is an evolving ClickHouse feature; readers on older versions (< 24.x) may lack some of these capabilities.
