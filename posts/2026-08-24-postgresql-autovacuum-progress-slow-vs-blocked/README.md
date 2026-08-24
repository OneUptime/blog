# Monitor PostgreSQL Autovacuum Progress: Slow or Blocked?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Autovacuum, pg_stat_progress_vacuum, Wait Event, Database Maintenance

Description: Monitor PostgreSQL vacuum phases across samples and distinguish normal scanning, cost delay, repeated index cycles, lock blocking, and cleanup constrained by old snapshots.

---

A long-running autovacuum is not automatically stuck. It may be scanning a large heap, repeatedly cycling through indexes, sleeping under cost-based throttling, waiting for I/O, or waiting for a conflicting lock. It can also make steady scan progress while an old transaction prevents removal of tuples that remain visible.

Use `pg_stat_progress_vacuum` for work completed and `pg_stat_activity` for what the worker is doing now. One snapshot is not enough to call it slow.

## Capture a current progress sample

On PostgreSQL 17 and later, this query uses the current progress columns:

```sql
SELECT p.pid,
       p.datname,
       p.relid::regclass AS relation,
       p.phase,
       p.heap_blks_total,
       p.heap_blks_scanned,
       p.heap_blks_vacuumed,
       CASE WHEN p.heap_blks_total > 0
            THEN round(100.0 * p.heap_blks_scanned
                       / p.heap_blks_total, 1)
       END AS heap_scan_percent,
       p.index_vacuum_count,
       p.dead_tuple_bytes,
       p.max_dead_tuple_bytes,
       p.num_dead_item_ids,
       p.indexes_total,
       p.indexes_processed,
       a.backend_type,
       a.query_start,
       a.wait_event_type,
       a.wait_event
FROM pg_stat_progress_vacuum AS p
JOIN pg_stat_activity AS a USING (pid)
WHERE p.datid = (SELECT oid FROM pg_database
                 WHERE datname = current_database())
ORDER BY a.query_start;
```

The database filter is important because relation OIDs are only meaningful within their database; casting another database's `relid` to `regclass` can resolve to an unrelated local object. Run this relation-resolving query once in each monitored database, or retain `datid` and numeric `relid` without casting in a cluster-wide collector.

PostgreSQL 17 renamed `max_dead_tuples` to `max_dead_tuple_bytes`, renamed `num_dead_tuples` to `num_dead_item_ids`, added `dead_tuple_bytes`, and added index progress columns. Generate the query for the server major version. PostgreSQL 18 additionally adds `delay_time`; it reports milliseconds spent sleeping due to cost-based delay when `track_cost_delay_timing` is enabled, and zero otherwise.

`VACUUM FULL` does not appear here because it rewrites a table; its progress is in `pg_stat_progress_cluster`.

## Interpret phases instead of one percentage

The heap percentage is meaningful during `scanning heap`. PostgreSQL counts pages skipped through the visibility map as scanned, so `heap_blks_scanned` eventually reaches the starting `heap_blks_total`. Blocks added after the scan began are not added to that total.

Other phases have different progress signals:

- `vacuuming indexes`: inspect `indexes_processed` on PostgreSQL 17+, not heap percentage.
- `vacuuming heap`: `heap_blks_vacuumed` advances, sometimes in jumps because blocks without dead tuples are skipped.
- `cleaning up indexes`: index cleanup is in progress after the heap scan.
- `truncating heap`: PostgreSQL is trying to return empty pages at the end of the relation. Truncation requires an `ACCESS EXCLUSIVE` lock; while waiting to acquire it, a worker reports `wait_event_type = 'Timeout'` and `wait_event = 'VacuumTruncate'`, not `wait_event_type = 'Lock'`.
- `performing final cleanup`: statistics and the free space map are being finalized.

`index_vacuum_count` greater than one is not a reset. A vacuum can perform multiple index-vacuum cycles when `maintenance_work_mem`, or `autovacuum_work_mem` for autovacuum when it is not `-1`, cannot hold all dead tuple identifiers found during one pass.

Store samples keyed by database, relation OID, PID, and `query_start`. Calculate progress over actual elapsed time. A PID alone can be reused after a backend exits.

## Identify a lock-blocked worker

The clearest queued heavyweight-lock signal is an active worker with `wait_event_type = 'Lock'`. Resolve its direct blockers:

```sql
SELECT vacuum.pid AS vacuum_pid,
       vacuum.query_start AS vacuum_started,
       vacuum.wait_event,
       blocker_pid,
       blocker.usename AS blocker_user,
       blocker.application_name AS blocker_application,
       blocker.state AS blocker_state,
       blocker.xact_start AS blocker_xact_start,
       left(blocker.query, 300) AS blocker_query
FROM pg_stat_activity AS vacuum
CROSS JOIN LATERAL
  unnest(pg_blocking_pids(vacuum.pid)) AS b(blocker_pid)
LEFT JOIN pg_stat_activity AS blocker
  ON blocker.pid = blocker_pid
WHERE vacuum.backend_type = 'autovacuum worker';
```

If the blocker PID is zero, inspect `pg_prepared_xacts`. If there is no progress row yet, still inspect `pg_stat_activity`: a worker can be delayed while acquiring an initial lock.

Autovacuum normally avoids prolonged disruption by yielding to certain conflicting operations. An anti-wraparound autovacuum, identifiable by `(to prevent wraparound)` in its activity query text, receives special protection and is not automatically interrupted in the same way. Do not cancel it simply to let routine DDL proceed; resolve the conflict and the underlying XID risk.

## Recognize slow but healthy work

A worker is making progress when the phase-appropriate counter changes across samples. Explain slow movement with its wait event and resource metrics:

- `IO` waits plus storage latency suggest read or write pressure.
- `wait_event_type = 'Timeout'` with `wait_event = 'VacuumDelay'`, or rising PostgreSQL 18 `delay_time`, indicates configured cost throttling;
- repeated index cycles suggest constrained vacuum work memory and many dead items;
- progress with high system I/O can be healthy maintenance competing with foreground work;
- a stable counter for one sample can simply mean the worker is in another phase.

Do not divide `heap_blks_scanned` by wall time across phase changes and label that the vacuum's completion ETA. Index cleanup, heap cleanup, truncation, and finalization can dominate after the heap reaches 100 percent.

## Detect an old snapshot that limits cleanup

An old transaction can prevent vacuum from removing recently dead tuples without blocking the vacuum's lock acquisition. The worker continues scanning, so `wait_event_type` might not be `Lock`:

```sql
SELECT pid,
       usename,
       application_name,
       state,
       clock_timestamp() - xact_start AS xact_age,
       backend_xid,
       age(backend_xid) AS xid_age,
       backend_xmin,
       age(backend_xmin) AS xmin_age
FROM pg_stat_activity
WHERE backend_xid IS NOT NULL
   OR backend_xmin IS NOT NULL
ORDER BY greatest(age(backend_xid), age(backend_xmin)) DESC NULLS LAST;
```

Also inspect old prepared transactions and replication slots, which can retain horizons outside ordinary client activity. A high `n_dead_tup` in `pg_stat_user_tables` is an estimate and is updated asynchronously; it is useful for trends, not a live count of what the current vacuum can remove.

## Alert on evidence, not duration alone

Useful alerts include:

- queued `Lock` wait or `VacuumTruncate` wait sustained beyond the normal DDL/DML overlap window;
- no phase-appropriate counter movement across several successful scrapes;
- repeated index cycles together with growing dead tuples;
- an anti-wraparound worker blocked or disappearing before completion;
- old `backend_xid` or `backend_xmin`, prepared transactions, or replication-slot horizons;
- autovacuum cancellations or long durations in logs.

Enable `log_autovacuum_min_duration` at an appropriate threshold to retain completion and problem evidence, but budget log volume. Pair each alert with database, relation, phase, query start, and worker PID in annotations rather than using ephemeral values as time-series labels.

## Official Documentation

- [PostgreSQL vacuum progress reporting](https://www.postgresql.org/docs/current/progress-reporting.html#VACUUM-PROGRESS-REPORTING)
- [PostgreSQL `pg_stat_activity` and wait events](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL routine vacuuming and autovacuum](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- [PostgreSQL autovacuum configuration](https://www.postgresql.org/docs/current/runtime-config-autovacuum.html)
- [PostgreSQL VACUUM](https://www.postgresql.org/docs/current/sql-vacuum.html)

## Conclusion

Judge vacuum health from changes across samples. A queued `Lock` wait with blocker PIDs is blocked, while `VacuumTruncate` identifies lock-constrained truncation; moving phase counters with I/O or cost delay is slow but active; and an old visibility horizon can limit cleanup without stopping the scan. Preserve version-specific column handling and treat anti-wraparound work as a safety operation.
