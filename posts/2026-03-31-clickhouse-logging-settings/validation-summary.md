# Validation Summary: How to Configure ClickHouse Logging Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, logging subsystem)
- XML configuration files (config.d override mechanism)
- System log tables (query_log, query_thread_log, trace_log, part_log)
- Syslog integration
- Structured JSON logging

## Sources Consulted
- ClickHouse official documentation: Server Configuration Parameters (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings)
- ClickHouse official documentation: system.query_log table (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse official documentation: Configuration Files and XML merging (https://clickhouse.com/docs/en/operations/configuration-files)
- ClickHouse official documentation: SYSTEM statements (https://clickhouse.com/docs/en/sql-reference/statements/system)
- ClickHouse official documentation: Session Settings (https://clickhouse.com/docs/en/operations/settings/settings)

## Issues Found

### Issue 1: Invalid `SET log_level` command
**What was wrong:** The post claimed that `SET log_level='debug'` could be used to change the server log level at runtime without restart. There is no `log_level` session setting in ClickHouse — this command would fail with an unknown setting error. The post also showed an equivalent HTTP curl command with the same invalid setting.

**What was changed:** Replaced the incorrect `SET log_level` examples with the correct approach: editing the config file and running `SYSTEM RELOAD CONFIG` to change the server log level at runtime. Also added a note about `SET send_logs_level = 'debug'` which is the valid session-level setting for receiving server log messages in the client (without changing server log files).

### Issue 2: Incorrect `remove` attribute value
**What was wrong:** The post used `remove="1"` to disable configuration elements (query_thread_log, trace_log). The official ClickHouse documentation specifies `remove="remove"` as the correct attribute value for removing elements during XML config merging.

**What was changed:** Changed both instances of `remove="1"` to `remove="remove"` to match the documented syntax.

## Review Notes
- The `<logger>` configuration block settings (level, log, errorlog, size, count, compress) and their defaults appear correct based on standard ClickHouse deployments.
- The JSON structured logging configuration using `<formatting>` within `<logger>` is a relatively recent feature. The syntax shown is plausible for ClickHouse 23.x+ but could not be fully verified against official documentation as the logger section was not found in the current docs page structure.
- The syslog configuration is standard and correct.
- The `system.query_log` SQL query was verified: `query_duration_ms`, `read_rows`, `memory_usage`, `query_id`, and `query` are all valid columns; `QueryFinish` is a valid type enum value; `event_time` is a valid column for filtering.
- The `query_log` configuration settings (`flush_interval_milliseconds`, `max_size_rows`, `reserved_size_rows`, `buffer_size_rows_flush_threshold`, `ttl`) are valid configuration options for system log tables.
- The mermaid diagram accurately represents ClickHouse's log architecture with text logs going to filesystem and system log tables stored in the system database.
