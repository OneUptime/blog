# Validation Summary: How to Use ClickHouse Server Logs for Debugging

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse server logging subsystem
- ClickHouse `system.query_log` and `system.errors` system tables
- ClickHouse `config.xml` logger configuration
- ClickHouse HTTP interface (query ID header)
- ReplicatedMergeTree replication logging
- Standard Linux CLI tools (`tail`, `grep`)

## Sources Consulted
- ClickHouse official documentation: Server Configuration Parameters — Logger (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#logger)
- ClickHouse official documentation: system.query_log (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse official documentation: system.text_log (https://clickhouse.com/docs/en/operations/system-tables/text_log)
- ClickHouse official documentation: HTTP Interface (https://clickhouse.com/docs/en/interfaces/http)
- ClickHouse source code: OwnPatternFormatter.cpp (log line format construction using `thread_id`)

## Issues Found
1. **Log format: `[pid]` changed to `[thread_id]`** (line 49): The blog post described the number in square brackets in the log format as the process ID (`pid`). In ClickHouse logs, this field is actually the OS thread ID (`thread_id`), as confirmed by the source code (`OwnPatternFormatter.cpp` uses `msg_ext.thread_id`) and the `system.text_log` table schema (column `thread_id UInt64 — OS thread ID`). Fixed to `[thread_id]`.

2. **Example timestamp precision corrected** (line 55): The example log line showed millisecond precision (`10:00:01.234`). ClickHouse actually logs with microsecond precision (6 decimal places). Fixed to `10:00:01.234567`.

## Review Notes
- The list of log levels (`none, fatal, critical, error, warning, notice, information, debug, trace`) is correct and complete for operational use. ClickHouse also has a `test` level used internally for development, but omitting it from a user-facing guide is appropriate.
- All `system.query_log` column names used in the SQL query (`query_start_time`, `query_duration_ms`, `read_rows`, `memory_usage`, `query`, `event_date`) are verified correct.
- The `X-ClickHouse-Query-Id` HTTP response header name is correct.
- The `<logger>` configuration XML structure with `<log>`, `<errorlog>`, `<level>`, `<size>`, and `<count>` tags is accurate.
- Default log file paths (`/var/log/clickhouse-server/clickhouse-server.log` and `.err.log`) are correct.
