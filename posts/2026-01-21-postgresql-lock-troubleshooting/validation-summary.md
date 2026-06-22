# Validation Summary: How to Troubleshoot PostgreSQL Lock Contention

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL lock monitoring
- PostgreSQL `pg_stat_activity`
- PostgreSQL backend control functions
- PostgreSQL row locking clauses
- PostgreSQL advisory locks
- GNU `grep`

## Sources Consulted
- PostgreSQL documentation: Explicit Locking - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL documentation: `pg_locks` - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL documentation: System Administration Functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation: `SELECT` - https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL documentation: Lock Management - https://www.postgresql.org/docs/current/runtime-config-locks.html
- PostgreSQL documentation: The Cumulative Statistics System - https://www.postgresql.org/docs/current/monitoring-stats.html

## Issues Found
- The `pg_terminate_backend` example referenced `waiting_pid`, which was not defined in the query and would fail. Changed it to derive distinct blocking PIDs from `pg_blocking_pids(pid)` for sessions that currently have blockers.
- The `pg_cancel_backend(pid)` example referenced an undefined `pid` outside a query context. Changed it to use a numeric placeholder PID so the function call is syntactically valid.

## Review Notes
The examples are broadly correct for current PostgreSQL. The log path in the `grep` example is common for package-based Linux installs but can vary by operating system, PostgreSQL packaging, or `log_directory` configuration.
