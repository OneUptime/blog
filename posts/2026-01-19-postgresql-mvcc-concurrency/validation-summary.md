# Validation Summary: How to Handle Concurrency with MVCC in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- MVCC
- SQL transactions and isolation levels
- PostgreSQL VACUUM and autovacuum
- PostgreSQL system catalog/statistics views
- Python database transaction usage

## Sources Consulted
- PostgreSQL Documentation: Chapter 13, Concurrency Control - https://www.postgresql.org/docs/current/mvcc.html
- PostgreSQL Documentation: Transaction Isolation - https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL Documentation: Explicit Locking - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL Documentation: System Columns - https://www.postgresql.org/docs/current/ddl-system-columns.html
- PostgreSQL Documentation: VACUUM - https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL Documentation: Routine Vacuuming - https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL Documentation: Runtime Configuration, Automatic Vacuuming - https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- PostgreSQL Documentation: Monitoring Statistics - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: BEGIN - https://www.postgresql.org/docs/current/sql-begin.html
- PostgreSQL Documentation: SET TRANSACTION - https://www.postgresql.org/docs/current/sql-set-transaction.html

## Issues Found
- The post described undeleted row versions as having `xmax=null`. PostgreSQL system columns use `0` for an undeleted row version, so the diagram and metadata description were updated to use `xmax=0`.
- The visibility rule said rows are visible when `xmin` committed before the transaction started. This is accurate for a transaction-level snapshot such as Repeatable Read, but Read Committed takes a new snapshot per statement. The wording was changed to refer to the transaction's snapshot.
- The transaction visibility example implied Repeatable Read behavior but started a default transaction. It was changed to `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ`.
- The isolation-level examples used `SET TRANSACTION` before `BEGIN`, which has no useful effect outside a transaction block. They were changed to use `BEGIN TRANSACTION ISOLATION LEVEL ...`.
- The post said PostgreSQL supports four isolation levels but only discussed three. The wording now clarifies that PostgreSQL accepts four SQL isolation level names, while Read Uncommitted behaves like Read Committed.
- The plain `VACUUM` comment said it updates statistics. PostgreSQL uses `VACUUM (ANALYZE)` or `ANALYZE` to update planner statistics, so the comment was corrected and a `VACUUM (ANALYZE)` example was added.
- The vacuum progress query labeled `heap_blks_vacuumed / heap_blks_total` as percent complete. That is not a reliable progress percentage across phases, so it was changed to show `heap_blks_scanned / heap_blks_total` as `pct_scanned`.

## Review Notes
The SQL examples are illustrative and assume separate sessions for concurrent transactions. The monitoring queries use cumulative statistics views, so `n_live_tup` and `n_dead_tup` should be treated as estimates rather than exact counts.
