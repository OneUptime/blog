# Validation Summary: How to Track Slow Queries with system.query_log in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system.query_log table)
- ClickHouse SQL query syntax
- ClickHouse server configuration (config.xml)
- ClickHouse materialized views

## Sources Consulted
- ClickHouse official documentation: system.query_log table (https://clickhouse.com/docs/operations/system-tables/query_log)
- ClickHouse official documentation: server configuration parameters (https://clickhouse.com/docs/operations/server-configuration-parameters/settings)
- ClickHouse GitHub repository: query_log.md source (https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/system-tables/query_log.md)
- ClickHouse GitHub issue #10285: Materialized views on system log tables (https://github.com/ClickHouse/ClickHouse/issues/10285)

## Issues Found
No technical issues found.

## Review Notes
- All `system.query_log` column names used in queries (`query_duration_ms`, `read_rows`, `read_bytes`, `memory_usage`, `query`, `type`, `event_time`, `is_initial_query`, `normalized_query_hash`, `user`, `tables`) are verified as correct.
- The `type = 'QueryFinish'` enum string comparison is the correct approach (Enum8 value 2).
- Configuration options `max_size_rows` and `reserved_size_rows` in the `<query_log>` block are valid.
- Settings `log_queries_min_type` (with value `'QUERY_FINISH'`) and `log_queries_min_query_duration_ms` are both valid ClickHouse settings.
- The materialized view on `system.query_log` section uses correct syntax. However, materialized views on system log tables have known reliability limitations (ClickHouse GitHub issue #10285) because system tables use an internal buffer flush mechanism rather than standard INSERTs. The MV may capture data in batches when the buffer flushes rather than in real-time. This is a common pattern shown in ClickHouse tutorials and is not technically incorrect, but users should be aware of this caveat for production alerting use cases.
