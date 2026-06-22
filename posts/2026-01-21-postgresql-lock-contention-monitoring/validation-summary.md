# Validation Summary: How to Monitor PostgreSQL Lock Contention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- SQL
- PostgreSQL server configuration
- Prometheus / postgres_exporter metrics

## Sources Consulted
- PostgreSQL documentation: `pg_locks` system view - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL documentation: `pg_blocking_pids()` session information function - https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL documentation: lock management settings including `deadlock_timeout` and `log_lock_waits` - https://www.postgresql.org/docs/current/runtime-config-locks.html
- PostgreSQL documentation: `lock_timeout` client setting - https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL documentation: `pg_cancel_backend()` and `pg_terminate_backend()` administration functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL documentation: statistics views and lock wait events - https://www.postgresql.org/docs/current/monitoring-stats.html
- prometheus-community postgres_exporter README - https://github.com/prometheus-community/postgres_exporter

## Issues Found
- The blocking-query example used a simplified self-join on `pg_locks` that only matched `locktype` and `relation`. PostgreSQL documentation notes that deriving blockers from `pg_locks` self-joins is difficult to get right and recommends `pg_blocking_pids()` instead. Replaced the query with a `pg_stat_activity` join using `pg_blocking_pids(blocked.pid)`.
- The `pg_terminate_backend(blocking_pid)` and `pg_cancel_backend(blocking_pid)` examples used `blocking_pid` as if it were a SQL variable. Changed the examples to use a numeric PID placeholder with a comment to replace it with the blocking PID.
- The `SET LOCAL lock_timeout` comment described the setting as "For specific statement". `SET LOCAL` is scoped to the current transaction, so the comment was corrected to "For current transaction".

## Review Notes
- The Prometheus alert is syntactically plausible for postgres_exporter deployments with the locks collector enabled, but `pg_locks_count{mode="ExclusiveLock"}` counts locks of that mode rather than directly measuring waiters. A production alert would usually be tuned to the exporter version, labels, and whether the goal is to count held locks, waiting sessions, or database-specific contention.
