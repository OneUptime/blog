# Validation Summary: How to Monitor PostgreSQL Autovacuum Progress and Tell a Slow Vacuum from a Blocked One

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL 16, 17, and 18
- PostgreSQL autovacuum and `VACUUM`
- `pg_stat_progress_vacuum` and `pg_stat_progress_cluster`
- `pg_stat_activity`, wait events, and `pg_blocking_pids()`
- PostgreSQL heavyweight locks and prepared transactions
- MVCC transaction horizons and replication slots
- Cost-based vacuum delay, vacuum work memory, and autovacuum logging

## Sources Consulted

- [PostgreSQL 16 VACUUM progress reporting](https://www.postgresql.org/docs/16/progress-reporting.html#VACUUM-PROGRESS-REPORTING)
- [PostgreSQL 17 VACUUM progress reporting](https://www.postgresql.org/docs/17/progress-reporting.html#VACUUM-PROGRESS-REPORTING)
- [PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html)
- [PostgreSQL 17 `autovacuum_work_mem`](https://www.postgresql.org/docs/17/runtime-config-resource.html#GUC-AUTOVACUUM-WORK-MEM)
- [PostgreSQL 18 VACUUM progress reporting](https://www.postgresql.org/docs/18/progress-reporting.html#VACUUM-PROGRESS-REPORTING)
- [PostgreSQL 18 `pg_stat_activity`, cumulative statistics, and wait events](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 `track_cost_delay_timing`](https://www.postgresql.org/docs/18/runtime-config-statistics.html#GUC-TRACK-COST-DELAY-TIMING)
- [PostgreSQL 18 session information functions and `pg_blocking_pids()`](https://www.postgresql.org/docs/18/functions-info.html#FUNCTIONS-INFO-SESSION)
- [PostgreSQL 18 `pg_locks`](https://www.postgresql.org/docs/18/view-pg-locks.html)
- [PostgreSQL 18 routine vacuuming and autovacuum](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [PostgreSQL 18 `VACUUM`](https://www.postgresql.org/docs/18/sql-vacuum.html)
- [PostgreSQL 18 `pg_replication_slots`](https://www.postgresql.org/docs/18/view-pg-replication-slots.html)
- [PostgreSQL 18 `PREPARE TRANSACTION`](https://www.postgresql.org/docs/18/sql-prepare-transaction.html)
- [PostgreSQL 18 autovacuum logging](https://www.postgresql.org/docs/18/runtime-config-logging.html#GUC-LOG-AUTOVACUUM-MIN-DURATION)

## Issues Found

- The post said PostgreSQL 18 exposes `delay_time` only when `track_cost_delay_timing` is enabled. The column always exists in PostgreSQL 18; it reports milliseconds spent in cost-based delay when timing is enabled and zero otherwise. Corrected the version-specific explanation.
- The multiple-index-cycle explanation implied that `autovacuum_work_mem` always governs autovacuum. Its default value of `-1` makes autovacuum use `maintenance_work_mem`. Corrected the explanation so `autovacuum_work_mem` applies only when it is not `-1`.
- The lock diagnosis did not distinguish truncation lock acquisition from queued heavyweight-lock waits. Heap truncation requires `ACCESS EXCLUSIVE`, but PostgreSQL reports time spent waiting to acquire that lock as `wait_event_type = 'Timeout'` and `wait_event = 'VacuumTruncate'`, not as a `Lock` wait. Added the exact signal to the phase guidance, alert guidance, and conclusion, and named `Timeout`/`VacuumDelay` explicitly for cost throttling.
- The old-horizon query filtered only on `backend_xmin`, so it could miss an old transaction with an assigned `backend_xid` but no current snapshot. Added `backend_xid`, both XID-age values, an `OR` filter covering either horizon source, and ordering by the older of the two ages.

## Review Notes

- The progress, blocker, and revised horizon queries were parsed and executed successfully against PostgreSQL 17 and PostgreSQL 18 instances.
- The main progress query intentionally uses the PostgreSQL 17-compatible column set. A PostgreSQL 18-specific collector can additionally select `delay_time`.
- `indexes_processed` is scoped to the current index-processing phase and can reset between phases or cycles; it can also remain unchanged while one large index is actively being processed. Interpret it together with `phase` and `index_vacuum_count`.
- Full details for other sessions in `pg_stat_activity` require a superuser or a role with `pg_read_all_stats`; otherwise security-restricted columns can be null.
- Cumulative statistics such as `n_dead_tup` can lag and can remain cached within a monitoring transaction. Repeated scrapes should use separate transactions or clear the statistics snapshot when appropriate.
