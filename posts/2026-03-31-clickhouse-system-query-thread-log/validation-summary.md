# Validation Summary: How to Use system.query_thread_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL queries, server configuration)
- `system.query_thread_log` system table
- `system.query_log` system table (used in JOIN example)
- ClickHouse ProfileEvents counters
- ClickHouse TTL management
- ClickHouse XML configuration (`users.xml`, `config.xml`)

## Sources Consulted
- ClickHouse official documentation: system.query_thread_log — https://clickhouse.com/docs/operations/system-tables/query_thread_log
- ClickHouse GitHub source: docs/en/operations/system-tables/query_thread_log.md — https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/system-tables/query_thread_log.md
- ClickHouse official documentation: SYSTEM statements (FLUSH LOGS) — https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse official documentation: TTL management — https://clickhouse.com/docs/guides/developer/ttl
- Altinity Knowledge Base: system table disk usage and query_log tips — https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-system-tables-eat-my-disk/

## Issues Found
No technical issues found.

All verified items:
- **Column names and types**: All 12 columns listed (`query_id`, `thread_id`, `thread_name`, `master_thread_id`, `query_start_time`, `query_duration_ms`, `read_rows`, `read_bytes`, `written_rows`, `memory_usage`, `peak_memory_usage`, `ProfileEvents`) have correct names and types matching the official schema.
- **`log_query_threads` setting**: Correct name and correct default value of `1`.
- **`event_date` column**: Valid column in the table, correctly used in WHERE clauses with `today()`.
- **ProfileEvents keys**: `UserTimeMicroseconds`, `SystemTimeMicroseconds`, and `RealTimeMicroseconds` are all valid profiling counter names.
- **SQL syntax**: All queries use valid ClickHouse SQL, including `formatReadableSize()`, `HAVING` with column aliases, aggregate functions, and Map key access with bracket notation.
- **`SYSTEM FLUSH LOGS`**: Valid ClickHouse command.
- **TTL syntax**: `ALTER TABLE ... MODIFY TTL event_date + INTERVAL 14 DAY DELETE` is correct.
- **XML configuration**: Both `users.xml` profile config and `config.xml` query_thread_log config blocks use valid format and element names (`flush_interval_milliseconds`, `ttl`, `database`, `table`).

## Review Notes
- The table actually contains approximately 41 columns; the post highlights 12 key ones. This is appropriate for a tutorial — the post never claims to be exhaustive.
- The thread imbalance query uses `max(read_rows) / avg(read_rows)` which performs integer/float division correctly in ClickHouse since `avg()` returns Float64.
- The mermaid diagram is a helpful conceptual illustration of thread hierarchy, though actual OS thread IDs would be large integers rather than 1-4.
