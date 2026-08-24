# Validation Summary: Find PostgreSQL Blocking Queries with `pg_blocking_pids()`

## Status

validated

## Post Type

PostgreSQL troubleshooting and lock-monitoring guide

## Technologies Covered

- PostgreSQL
- SQL and recursive common table expressions
- `pg_blocking_pids()`
- `pg_locks`
- `pg_stat_activity` and wait events
- PostgreSQL lock manager and lock queues
- Prepared transactions and `pg_prepared_xacts`
- `pg_cancel_backend()` and `pg_terminate_backend()`

## Sources Consulted

- PostgreSQL 18 System Information Functions and Operators (`pg_blocking_pids()`) - https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL 18 `pg_locks` view - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL 18 cumulative statistics system, `pg_stat_activity`, and wait events - https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW
- PostgreSQL 18 run-time statistics configuration (`track_activity_query_size`) - https://www.postgresql.org/docs/current/runtime-config-statistics.html#GUC-TRACK-ACTIVITY-QUERY-SIZE
- PostgreSQL 18 predefined roles (`pg_monitor` and `pg_read_all_stats`) - https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL 18 recursive `WITH` queries and cycle detection - https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-RECURSIVE
- PostgreSQL 18 explicit locking and deadlocks - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL 18 `pg_prepared_xacts` view - https://www.postgresql.org/docs/current/view-pg-prepared-xacts.html
- PostgreSQL 18 two-phase transactions - https://www.postgresql.org/docs/current/two-phase.html
- PostgreSQL 18 `COMMIT PREPARED` - https://www.postgresql.org/docs/current/sql-commit-prepared.html
- PostgreSQL 18 `ROLLBACK PREPARED` - https://www.postgresql.org/docs/current/sql-rollback-prepared.html
- PostgreSQL 18 server signaling functions - https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL
- PostgreSQL 14 `pg_locks`, checked for compatibility with the oldest currently supported major release - https://www.postgresql.org/docs/14/view-pg-locks.html
- PostgreSQL 14 System Information Functions, checked for `pg_blocking_pids()` compatibility - https://www.postgresql.org/docs/14/functions-info.html

## Issues Found

- The direct-blocker query labeled `clock_timestamp() - wa.query_start` as `wait_age`, but `query_start` records when the query began, not when its lock wait began. Renamed the result to `waiter_query_age`; the actual lock-wait start is exposed as `pg_locks.waitstart`.
- The recursive term excluded `e.blocker_pid = 0`. That prevented an upstream waiter's path from reaching a prepared-transaction head blocker and could leave that waiter with no row marked as a head. Removed the exclusion; PID zero terminates naturally because it cannot appear as a `waiter_pid` in the activity-derived edge set.
- The recursive-query introduction described cycles as malformed, but a real deadlock can temporarily form a cycle before PostgreSQL detects and resolves it. Changed the wording to cover any cycle.
- The guarded `regclass` cast resolved relations only for the current database OID and omitted shared relations, whose `pg_locks.database` value is zero. Added `l.database = 0` to the guard.
- The snapshot explanation said fast-path locks themselves were obtained from individual backends. PostgreSQL gathers fast-path lock data from backends one at a time. Corrected the wording to describe data collection accurately.
- The cross-user activity-visibility statement omitted superusers and sessions owned by roles of which the viewer is a member. Clarified those cases and noted that `pg_monitor` includes `pg_read_all_stats`.

## Review Notes

The corrected examples use features available in PostgreSQL 14 through PostgreSQL 18, the supported major versions on the validation date. When several prepared transactions exist, the shown `pg_prepared_xacts` query lists candidates but does not by itself identify which one corresponds to a zero returned by `pg_blocking_pids()`; `pg_locks.virtualtransaction` can be correlated with `'-1/' || pg_prepared_xacts.transaction` if that distinction is needed. Frequent polling of `pg_blocking_pids()` can briefly contend on lock-manager shared state, so monitoring intervals should be chosen deliberately.
