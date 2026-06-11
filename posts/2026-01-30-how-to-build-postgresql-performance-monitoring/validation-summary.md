# Validation Summary: How to Build PostgreSQL Performance Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pg_stat_statements
- pg_stat_user_tables
- pg_stat_activity
- pg_locks and pg_blocking_pids()
- auto_explain
- Prometheus
- prometheus-community postgres_exporter

## Sources Consulted
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: Cumulative Statistics System - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL documentation: auto_explain - https://www.postgresql.org/docs/current/auto-explain.html
- PostgreSQL documentation: pg_locks - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL documentation: System Information Functions, including pg_blocking_pids() - https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL documentation: Error Reporting and Logging - https://www.postgresql.org/docs/current/runtime-config-logging.html
- prometheus-community postgres_exporter README - https://github.com/prometheus-community/postgres_exporter
- prometheus-community postgres_exporter collectors - https://github.com/prometheus-community/postgres_exporter/tree/master/collector

## Issues Found
- The lock monitoring query attempted to identify blockers by self-joining `pg_locks` only on `locktype` and `relation`. PostgreSQL documentation warns that this approach is difficult to get right because it must account for lock mode conflicts, wait queue ordering, and parallel workers. Replaced it with a `pg_blocking_pids()` query joined to `pg_stat_activity`, which is the documented way to identify blocking sessions.
- The postgres_exporter example listed `pg_stat_statements_calls_total` as a key metric but did not enable the exporter's `stat_statements` collector. Current postgres_exporter documentation marks that collector as disabled by default. Added `command: ["--collector.stat_statements"]` to the Docker Compose example.

## Review Notes
The remaining PostgreSQL configuration snippets and SQL examples are valid for current supported PostgreSQL versions. `DATA_SOURCE_NAME` is still accepted by postgres_exporter, though current quick-start examples prefer `DATA_SOURCE_URI`, `DATA_SOURCE_USER`, and `DATA_SOURCE_PASS`.
