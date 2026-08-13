# Validation Summary: Why a PostgreSQL DEFAULT Partition Can Block New Partition Creation

## Status

validated

## Post Type

Technical guide and operational runbook

## Technologies Covered

- PostgreSQL declarative range partitioning
- PostgreSQL default partitions
- `CREATE TABLE ... PARTITION OF` and `ALTER TABLE ... ATTACH PARTITION`
- `CHECK` constraints, `NOT VALID`, and `VALIDATE CONSTRAINT`
- PostgreSQL relation locks and `lock_timeout`
- `pg_stat_activity`, `pg_locks`, `pg_blocking_pids()`, and `pg_partition_tree()`

## Sources Consulted

- [PostgreSQL 18: Declarative Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL 18: Check Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
- [PostgreSQL 18: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL 18: `lock_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT)
- [PostgreSQL 18: `pg_locks`](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [PostgreSQL 18: `pg_stat_activity`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)
- [PostgreSQL 18: System Information Functions, including `pg_blocking_pids()`](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL 18: Partitioning Information Functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION)
- [PostgreSQL 12 Release Notes](https://www.postgresql.org/docs/release/12.0/)
- [PostgreSQL 14 Release Notes](https://www.postgresql.org/docs/release/14.0/)

## Issues Found

- The reproduction described an existing August row but never inserted one, so the attempted direct partition creation would have succeeded against an empty default partition. Added an August insert routed through the parent so the example now produces the documented default-overlap error.
- The post called the demonstrated objects “exclusion constraints,” but PostgreSQL reserves that term for `EXCLUDE` constraints. Changed the wording to `CHECK` constraints that include or exclude the August range.
- `ADD CHECK ... NOT VALID` skipped the initial scan but still acquired `ACCESS EXCLUSIVE` without a timeout. Wrapped that DDL in a transaction with a session-local `lock_timeout` and documented that the timeout limits each lock-acquisition wait rather than execution time.
- The runbook placed its write fence after adding and validating the default-table check, even though that check starts rejecting new August rows as soon as it is added. Moved the fence and final reconciliation before the check and kept the fence through attachment.
- The standalone-table definition omitted indexes. PostgreSQL would create any missing indexes corresponding to parent indexes during `ATTACH PARTITION`, extending the cutover. Added `INCLUDING INDEXES` and updated the runbook to prebuild equivalent indexes.
- “Bounded transaction” overstated what `lock_timeout` guarantees. Renamed the section to a bounded lock wait and documented the exact parent, candidate, and default-partition locks that attachment still takes.
- The post described PostgreSQL as changing the default partition's internal bound. Its declared bound remains `DEFAULT`; PostgreSQL changes its internal partition constraint. Corrected the terminology.
- The relation-lock query did not restrict `pg_locks` to the current database. Because `pg_locks` is cluster-wide and relation OIDs are database-local, it could display unrelated locks under misleading `regclass` names. Added a current-database filter.
- The partition-information documentation link targeted the wrong manual page. Updated it to the current `functions-admin.html#FUNCTIONS-INFO-PARTITION` location.

## Review Notes

- All SQL examples were executed end to end on PostgreSQL 18.4. The intended direct-creation failure occurred, PostgreSQL reported that both validated checks implied the required partition constraints during attachment, and the routing, catalog, lock-monitoring, partition-tree, and index-attachment queries succeeded.
- The post targets the current PostgreSQL manual, which is PostgreSQL 18 on the validation date. The reduced parent lock for `ATTACH PARTITION` and `pg_partition_tree()` require PostgreSQL 12 or newer; `DETACH PARTITION ... CONCURRENTLY` requires PostgreSQL 14 or newer.
- The row-reconciliation mechanism is intentionally application-specific. The post correctly warns that production migrations need a write fence, ordered change capture, or explicit locking suited to their keys, triggers, and write volume.
- For a generalized implementation, explicit insert column lists are safer than `SELECT *` when an existing attached default partition might have a different physical column order. The shown schema creates its default directly from the parent, so its example is correct as written.
