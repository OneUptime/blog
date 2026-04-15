# Validation Summary: How to Write a ClickHouse Replication Status Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system tables: `system.replicas`, `system.replication_queue`)
- Bash scripting
- ClickHouse HTTP interface (port 8123)
- curl for HTTP queries

## Sources Consulted
- ClickHouse official documentation on `system.replicas` table: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse official documentation on `system.replication_queue` table: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse official documentation on `dateDiff` function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse official documentation on output formats (PrettyCompactMonoBlock, TabSeparated): https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse official documentation on HTTP interface: https://clickhouse.com/docs/en/interfaces/http
- Cross-referenced with validated blog posts in this repo: `clickhouse-system-replicas-table`, `clickhouse-test-failover-procedures`, `clickhouse-replication-monitoring-dashboard`

## Issues Found
No technical issues found.

## Review Notes
- All `system.replicas` columns used (`database`, `table`, `replica_name`, `is_leader`, `is_readonly`, `is_session_expired`, `future_parts`, `parts_to_check`, `queue_size`, `absolute_delay`, `total_replicas`, `active_replicas`) are verified to exist in the official documentation.
- All `system.replication_queue` columns used (`database`, `table`, `type`, `create_time`, `parts_to_merge`, `source_replica`, `is_currently_executing`) are verified to exist in the official documentation.
- The `dateDiff('second', create_time, now())` syntax is correct ClickHouse SQL.
- `FORMAT PrettyCompactMonoBlock` and `FORMAT TabSeparated` are both valid ClickHouse output formats.
- The curl-based HTTP interface usage (port 8123, `--data-binary`, `-u` for auth) is correct.
- The alerting example runs the script twice on failure (once to detect, once to capture output for email). This is functional but slightly inefficient; capturing output on the first run would be more optimal. This is a style preference, not a technical error.
