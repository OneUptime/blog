# Find PostgreSQL Blocking Queries with `pg_blocking_pids()`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Lock Monitoring, pg_blocking_pids, pg_locks, Wait Event

Description: Trace PostgreSQL lock waits to their direct and root blockers using supported lock-manager functions, activity data, and carefully interpreted lock details.

---

When a PostgreSQL query is stuck, the row in `pg_stat_activity` tells you that it is waiting, but not automatically which session is responsible. `pg_blocking_pids()` is the safest starting point: PostgreSQL asks its lock manager for sessions that directly block a target PID, including waiters ahead of it in the lock queue.

Use `pg_locks` afterward to understand the requested lock and object. A simplistic self-join on `pg_locks` is easy to get wrong because lock modes have a conflict matrix, several lock identity columns are nullable, and queue order creates soft blocking even when the earlier waiter has not acquired the lock.

## Capture direct blocker edges

Run this as one short autocommit statement so all activity rows come from one monitoring snapshot:

```sql
WITH blocker_edges AS (
  SELECT waiter.pid AS waiter_pid,
         blocker_pid
  FROM pg_stat_activity AS waiter
  CROSS JOIN LATERAL
    unnest(pg_blocking_pids(waiter.pid)) AS b(blocker_pid)
)
SELECT e.waiter_pid,
       wa.usename AS waiter_user,
       wa.application_name AS waiter_application,
       clock_timestamp() - wa.query_start AS waiter_query_age,
       wa.wait_event_type,
       wa.wait_event,
       left(wa.query, 300) AS waiter_query,
       e.blocker_pid,
       ba.usename AS blocker_user,
       ba.application_name AS blocker_application,
       ba.state AS blocker_state,
       clock_timestamp() - ba.xact_start AS blocker_xact_age,
       left(ba.query, 300) AS blocker_query
FROM blocker_edges AS e
JOIN pg_stat_activity AS wa ON wa.pid = e.waiter_pid
LEFT JOIN pg_stat_activity AS ba ON ba.pid = e.blocker_pid
ORDER BY wa.query_start, e.blocker_pid;
```

An active backend with `wait_event_type = 'Lock'` is waiting on a heavyweight lock. State and wait event are independent: `active` means PostgreSQL is executing the query, and a non-null wait event means that execution is currently blocked somewhere.

Do not filter only on `wait_event = 'relation'`. Row-lock contention commonly surfaces as a wait on the other transaction's ID (`transactionid`), while DDL often waits for a relation lock.

## Follow a chain to the head blocker

A direct blocker can itself be blocked. This recursive query retains every path and prevents a cycle from recursing forever:

```sql
WITH RECURSIVE edges AS (
  SELECT a.pid AS waiter_pid,
         blocker_pid
  FROM pg_stat_activity AS a
  CROSS JOIN LATERAL
    unnest(pg_blocking_pids(a.pid)) AS b(blocker_pid)
), chains AS (
  SELECT waiter_pid,
         blocker_pid,
         ARRAY[waiter_pid, blocker_pid] AS path
  FROM edges

  UNION ALL

  SELECT c.waiter_pid,
         e.blocker_pid,
         c.path || e.blocker_pid
  FROM chains AS c
  JOIN edges AS e ON e.waiter_pid = c.blocker_pid
  WHERE NOT e.blocker_pid = ANY(c.path)
)
SELECT c.waiter_pid,
       c.blocker_pid,
       c.path,
       NOT EXISTS (
         SELECT 1 FROM edges AS next_edge
         WHERE next_edge.waiter_pid = c.blocker_pid
       ) AS is_head_blocker
FROM chains AS c
ORDER BY c.waiter_pid, cardinality(c.path);
```

The result can branch because one request may have multiple blockers. Parallel queries can also yield duplicate client-visible PIDs. Deduplicate only after preserving the path information.

A blocker PID of zero means a prepared transaction owns the conflicting lock. Inspect it separately:

```sql
SELECT transaction, gid, prepared, owner, database
FROM pg_prepared_xacts
ORDER BY prepared;
```

Prepared transactions have no live client backend to terminate; resolve them with the transaction coordinator and an explicit `COMMIT PREPARED` or `ROLLBACK PREPARED` decision.

## Inspect the requested locks

Once the waiter PID is known, list its ungranted requests:

```sql
SELECT l.pid,
       d.datname,
       l.locktype,
       l.mode,
       CASE WHEN l.database = 0
              OR l.database = (SELECT oid
                               FROM pg_database
                               WHERE datname = current_database())
            THEN l.relation::regclass::text
       END AS relation,
       l.page,
       l.tuple,
       l.transactionid,
       l.virtualxid,
       l.classid,
       l.objid,
       l.objsubid,
       l.waitstart
FROM pg_locks AS l
LEFT JOIN pg_database AS d ON d.oid = l.database
WHERE l.pid = 24680
  AND NOT l.granted
ORDER BY l.waitstart NULLS LAST;
```

`waitstart` can briefly be null immediately after the wait begins. The columns that identify a lock depend on `locktype`; do not assume `relation` is populated. The guarded cast avoids resolving another database's relation OID against the current database's catalogs. Advisory locks, transaction-ID locks, object locks, page locks, and relation locks use different identity fields.

`pg_locks` also has snapshot caveats. Fast-path lock data is gathered from individual backends without freezing all backend lock state simultaneously, and predicate-lock-manager data is not acquired atomically with the regular lock manager. Expect momentary inconsistencies during high churn. This is another reason to use `pg_blocking_pids()` for the edge and `pg_locks` for explanation.

## Decide which SQL text matters

For a waiting backend, `query` is the statement attempting the lock. For a blocker that is `idle in transaction`, `query` is only its most recently executed statement. That statement may have acquired the lock, but the complete business operation can span several statements. Use `xact_start`, `application_name`, client identity, and trace correlation to find the owner.

Query text is truncated at `track_activity_query_size`, whose default is 1024 bytes. Raising it affects shared memory and only takes effect after restart. Users can see full details for sessions owned by roles they belong to. Seeing full details for sessions owned by unrelated roles requires superuser privileges or `pg_read_all_stats` (included in `pg_monitor`); otherwise many security-restricted columns can be null.

## Alert and remediate safely

Alert on sustained blocked duration and fan-out, not on the mere existence of a short lock wait. Useful dimensions include database, waiter application, blocker application, and lock type. Keep PIDs and query text in annotations or a restricted diagnostic store rather than labels.

Prefer these actions in order:

1. Let a healthy short transaction finish.
2. Ask the owner to commit or roll back an idle transaction.
3. Cancel an actively running blocker with `pg_cancel_backend()` if canceling that statement is sufficient.
4. Terminate the session with `pg_terminate_backend()` only when rollback impact is understood.
5. Resolve a prepared transaction through its coordinator.

Never kill the oldest PID automatically without checking whether it is a migration, maintenance operation, or critical transaction. The head blocker is the causal place to investigate, not automatically the correct process to terminate.

## Official Documentation

- [PostgreSQL session information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL `pg_locks` view](https://www.postgresql.org/docs/current/view-pg-locks.html)
- [PostgreSQL `pg_stat_activity` and wait events](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL prepared transactions](https://www.postgresql.org/docs/current/two-phase.html)

## Conclusion

Use `pg_blocking_pids()` to establish direct blocker edges, recurse those edges to find head blockers, and inspect ungranted `pg_locks` rows to explain the resource involved. Interpret activity state, queue order, prepared transactions, and snapshot caveats before choosing any cancellation or termination action.
