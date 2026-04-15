# Validation Summary: How to Use SYSTEM FLUSH LOGS in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- SYSTEM FLUSH LOGS statement
- ClickHouse system log tables (query_log, trace_log, part_log, etc.)
- ClickHouse server configuration (config.xml)

## Sources Consulted
- [ClickHouse SYSTEM statements documentation — FLUSH LOGS section](https://clickhouse.com/docs/en/sql-reference/statements/system#flush-logs)
- [ClickHouse system.query_log documentation](https://clickhouse.com/docs/en/operations/system-tables/query_log)
- [ClickHouse system.part_log documentation](https://clickhouse.com/docs/en/operations/system-tables/part_log)
- [PR #76132: Support flushing individual logs in SYSTEM FLUSH LOGS](https://github.com/ClickHouse/ClickHouse/pull/76132) — merged Feb 2025, available in v25.4+
- [ClickHouse knowledgebase: Finding expensive queries by memory usage](https://clickhouse.com/docs/knowledgebase/finding_expensive_queries_by_memory_usage)

## Issues Found

1. **Incorrect version for targeted flush feature**: The post claimed "ClickHouse 23.3+" supports flushing specific log tables (`SYSTEM FLUSH LOGS query_log`). This feature was actually introduced in PR #76132 (merged February 2025) and is available starting in ClickHouse 25.4+. Fixed both the "Flushing a Specific Log Table" section and the Summary section to say "25.4+".

2. **Incorrect column name `peak_memory_usage` in benchmark example**: The "After a benchmark" SQL example referenced `peak_memory_usage` as a column in `system.query_log`. The correct column name is `memory_usage`. The first example in the post ("Basic Usage") already used the correct name. Fixed the benchmark example to use `memory_usage`.

## Review Notes
- The list of system log tables is comprehensive but not exhaustive — newer ClickHouse versions include additional tables like `system.query_views_log`, `system.filesystem_cache_log`, `system.backup_log`, and `system.blob_storage_log`. The post does not claim the list is complete, and the disclaimer "Only tables that are enabled in your server configuration will be present and flushed" is appropriate.
- The `system.crash_log` entry is technically accurate but somewhat special — crash data is typically written on server restart after a crash, not buffered during normal operation. This is a minor nuance and does not warrant a correction.
- The targeted flush syntax shown (`SYSTEM FLUSH LOGS query_log`) is correct per the official docs. The docs also note you can use the full `database.table` form (e.g., `system.query_log`) and flush multiple tables in one command.
