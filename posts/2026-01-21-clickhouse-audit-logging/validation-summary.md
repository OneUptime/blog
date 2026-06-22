# Validation Summary: How to Set Up ClickHouse Audit Logging

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse
- ClickHouse system tables
- ClickHouse server configuration
- SQL
- Audit logging and compliance monitoring

## Sources Consulted
- ClickHouse documentation: system.query_log - https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse documentation: system.session_log - https://clickhouse.com/docs/operations/system-tables/session_log
- ClickHouse documentation: system.query_thread_log - https://clickhouse.com/docs/operations/system-tables/query_thread_log
- ClickHouse documentation: System tables overview - https://clickhouse.com/docs/operations/system-tables/overview
- ClickHouse documentation: CREATE VIEW / materialized views - https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse Cloud documentation: Database audit log - https://clickhouse.com/docs/cloud/security/audit-logging/database-audit-log

## Issues Found
- The query log configuration used the `database` element for system log tables. ClickHouse documentation marks this option as deprecated because all system log tables are under the `system` database. Removed the deprecated `database` elements from the `query_log` and `query_thread_log` examples.
- The session log query selected `initial_query_id`, which is a `system.query_log` column and is not present in `system.session_log`. Replaced it with session log columns documented by ClickHouse: `type`, `auth_type`, `client_address`, and `failure_reason`.
- The custom audit materialized view populated a `source_ip` field from `client_hostname`. ClickHouse `system.query_log` exposes `address` for the client IP address, while `client_hostname` is the client host name. Changed the expression to `toString(address) AS source_ip`.

## Review Notes
The `query_thread_log` configuration section is valid, but ClickHouse requires the `log_query_threads` setting to be enabled for thread logging to start. The post does not analyze `system.query_thread_log`, so this was left as a configuration example rather than expanding the guide.
