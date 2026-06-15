# Validation Summary: How to Reduce Lock Contention in PostgreSQL

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- PostgreSQL locking and concurrency control
- PostgreSQL system views and monitoring functions
- PostgreSQL transaction isolation levels
- PostgreSQL advisory locks
- PostgreSQL concurrent index creation
- PostgreSQL declarative partitioning

## Sources Consulted
- PostgreSQL 18 Documentation: Explicit Locking - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL 18 Documentation: pg_locks - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL 18 Documentation: Error Reporting and Logging (`log_lock_waits`) - https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL 18 Documentation: Lock Management (`deadlock_timeout`) - https://www.postgresql.org/docs/current/runtime-config-locks.html
- PostgreSQL 18 Documentation: Transaction Isolation - https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL 18 Documentation: SELECT locking clauses and `SKIP LOCKED` - https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL 18 Documentation: Advisory Lock Functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL 18 Documentation: CREATE INDEX and `CONCURRENTLY` - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL 18 Documentation: Table Partitioning - https://www.postgresql.org/docs/current/ddl-partitioning.html

## Issues Found
- The blocked-query monitoring example manually joined `pg_locks` to itself without checking lock-mode conflicts or queue ordering. PostgreSQL documentation warns this is difficult to get right and recommends `pg_blocking_pids()`. Replaced the query with a `pg_stat_activity` query using `pg_blocking_pids()` and `unnest()`.
- The batch update example used two separate `unnest()` calls joined with `ON true`, creating a Cartesian product between IDs and balances instead of pairing corresponding array elements. Changed it to multi-argument `unnest(..., ...) AS updates(id, new_balance)` so each ID is paired with the intended balance before ordering.
- The partitioning section implied partitioning generally reduces update lock contention on a hot table. PostgreSQL row updates on different rows do not require partitioning to avoid table-level `ROW EXCLUSIVE` conflicts, so the wording was narrowed to cases where contention is concentrated in predictable ranges or maintenance operations can target different physical partitions.
- The isolation-level section implied `REPEATABLE READ READ ONLY` reduces locking for analytics queries. PostgreSQL plain `SELECT` queries already use MVCC snapshots and do not block writers at the default `READ COMMITTED` level. Reworded the section to describe `REPEATABLE READ READ ONLY` as a stable-snapshot choice, with a retry caveat if writes are later added.

## Review Notes
The remaining examples and claims align with current PostgreSQL documentation. `CREATE INDEX CONCURRENTLY` caveats, `log_lock_waits` behavior through `deadlock_timeout`, advisory lock behavior, deadlock prevention through consistent ordering, and `SKIP LOCKED` for queue-like workloads were verified against official PostgreSQL documentation.
