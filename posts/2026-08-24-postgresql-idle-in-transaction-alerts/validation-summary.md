# Validation Summary: How to Alert on PostgreSQL `idle in transaction` Sessions Before They Block VACUUM and DDL

## Status

validated

## Post Type

Operational monitoring guide

## Technologies Covered

- PostgreSQL 14 through 18
- PostgreSQL MVCC, transaction snapshots, and transaction states
- `pg_stat_activity`, `pg_stat_user_tables`, and statistics snapshots
- PostgreSQL heavyweight locks, `pg_blocking_pids()`, `pg_locks`, and prepared transactions
- Autovacuum and routine `VACUUM`
- `idle_in_transaction_session_timeout`, `statement_timeout`, and `lock_timeout`
- PostgreSQL role defaults, monitoring roles, and backend signaling functions
- Prometheus metric labels and sustained alert conditions

## Sources Consulted

- [PostgreSQL 18 activity monitoring, `pg_stat_activity`, and table statistics](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 date/time functions and `clock_timestamp()`](https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT)
- [PostgreSQL 18 session information functions and `pg_blocking_pids()`](https://www.postgresql.org/docs/18/functions-info.html)
- [PostgreSQL 18 `pg_locks`](https://www.postgresql.org/docs/18/view-pg-locks.html)
- [PostgreSQL 18 `pg_prepared_xacts`](https://www.postgresql.org/docs/18/view-pg-prepared-xacts.html)
- [PostgreSQL 18 transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18 explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html)
- [PostgreSQL 18 routine vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 client connection defaults and timeouts](https://www.postgresql.org/docs/18/runtime-config-client.html)
- [PostgreSQL 18 `ALTER ROLE`](https://www.postgresql.org/docs/18/sql-alterrole.html)
- [PostgreSQL 18 predefined monitoring and signaling roles](https://www.postgresql.org/docs/18/predefined-roles.html)
- [PostgreSQL 18 server signaling functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL)
- [PostgreSQL 14 server signaling functions](https://www.postgresql.org/docs/14/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL)
- [PostgreSQL 13 server signaling functions](https://www.postgresql.org/docs/13/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL)
- [PostgreSQL 18 libpq connection parameters](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus alerting-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found

- The blocking query labeled `clock_timestamp() - query_start` as `wait_age`, but `query_start` records when the active statement began, not when its lock wait began. Renamed the result to `waiter_query_age` and explained that it is only an upper bound on the lock-wait duration; `pg_locks.waitstart` is the documented heavyweight-lock wait timestamp.
- The soft-blocker explanation said that any session ahead in the lock queue is returned. PostgreSQL returns a queued session only when its requested lock also conflicts with the waiter's request. Corrected the explanation to include that condition.
- The monitoring-transaction warning said an age calculated with `clock_timestamp()` could remain unchanged. PostgreSQL can cache activity state and timestamps for the monitoring transaction, but `clock_timestamp()` continues advancing. Corrected the text to explain that calculated ages can keep growing from stale timestamps.
- The initial query includes `idle in transaction (aborted)`, but the post did not explain that PostgreSQL has already aborted the database transaction in this state. Added guidance to age the failed state with `state_change` because `xact_start`, `backend_xid`, and `backend_xmin` can be null.
- The activity queries did not state the privileges required for complete cross-user results. Added that the monitoring role needs `pg_read_all_stats` or superuser access; otherwise security-restricted activity columns for other users can be null.
- The vacuum-impact text described `n_dead_tup` as a dead-tuple count without identifying it as an estimate. Corrected the wording to say "estimated dead-tuple counts."

## Review Notes

- The revised activity, blocking, and table-statistics queries and the `ALTER ROLE` example were executed successfully against PostgreSQL 14.17. The two-argument `pg_terminate_backend(integer, bigint)` signature was also confirmed there.
- PostgreSQL 18 was the current major version on the validation date. The post's SQL and configuration examples are compatible with all then-supported PostgreSQL releases, 14 through 18.
- The optional timeout argument to `pg_terminate_backend()` was introduced in PostgreSQL 14. PostgreSQL 13 accepts only the one-argument form, but PostgreSQL 13 was unsupported on the validation date.
- `pg_blocking_pids()` can return multiple blockers and duplicate client-visible PIDs for parallel queries. An exporter calculating a blocked-waiter count should count distinct waiter PIDs rather than blocking-query rows.
- Standard `VACUUM` can still run while an old transaction prevents it from removing particular row versions. The post's body states this precisely; "block VACUUM" in the title is shorthand for inhibiting cleanup rather than a claim that ordinary `VACUUM` must wait on the session.
