# Validation Summary: How to Monitor ClickHouse Query Queue

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (system tables, configuration, SQL)
- Prometheus (alerting rules)
- Bash scripting (monitoring script)

## Sources Consulted
- ClickHouse Server Settings documentation — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse system.query_log documentation — https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse system.query_thread_log documentation — https://clickhouse.com/docs/operations/system-tables/query_thread_log
- ClickHouse system.settings vs system.server_settings — https://github.com/ClickHouse/ClickHouse/issues/38870
- ClickHouse ProfileEvents source — https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp

## Issues Found

1. **`system.settings` used instead of `system.server_settings` for `max_concurrent_queries`**: The query in "Checking Current Query Activity" used `system.settings` to look up `max_concurrent_queries`. This is a server-level configuration setting, not a session-level setting, so it does not appear in `system.settings`. Changed to `system.server_settings`.

2. **Duplicate `query_id` column in `system.query_thread_log` query**: The query in "Detecting Queries That Are Stuck" selected `query_id` twice. Removed the duplicate.

3. **Non-existent columns `os_user_time`, `os_system_time`, `os_wait_time` in `system.query_thread_log`**: These columns do not exist as top-level columns in `system.query_thread_log`. OS-level timing metrics are stored in the `ProfileEvents` map column. Replaced with `ProfileEvents['OSCPUVirtualTimeMicroseconds']` and `ProfileEvents['OSCPUWaitMicroseconds']`, which are the correct ProfileEvent keys for CPU time and wait time.

4. **Misleading XML comment for `max_concurrent_queries_for_user`**: The comment said "Queue size when max_concurrent_queries is reached" but this setting limits the maximum number of concurrent queries per user. Changed to "Maximum concurrent queries per user".

5. **Incorrect XML comment for `max_waiting_queries`**: The comment said "Maximum wait time in the queue in milliseconds" but `max_waiting_queries` is a count (the maximum number of queries that can wait in the queue), not a time value. Changed to "Maximum number of queries waiting in queue when max_concurrent_queries is reached".

## Review Notes
- The `system.server_settings` table was introduced in ClickHouse 22.3+. On older versions, `max_concurrent_queries` cannot be queried via SQL and must be checked in the server config file directly.
- The `max_waiting_queries` setting (for queuing queries instead of rejecting them immediately) was introduced in ClickHouse 24.3+. On older versions, queries exceeding `max_concurrent_queries` are rejected outright.
- The Prometheus alerting example uses `clickhouse_process_elapsed_seconds` which assumes a specific exporter configuration; the metric name may vary depending on which ClickHouse Prometheus exporter is used.
