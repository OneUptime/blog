# How to Alert on PostgreSQL `idle in transaction` Sessions Before They Block VACUUM and DDL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Idle in Transaction, Autovacuum, Lock Monitoring, Database Alerts

Description: Detect and control idle PostgreSQL transactions by alerting on both state age and transaction age before retained snapshots and locks disrupt maintenance.

---

A session is `idle in transaction` when it has an open transaction but is waiting for the client to send another command. It is not executing SQL, yet it may retain a snapshot, hold locks, and prevent `VACUUM` from removing recently dead row versions that could still be visible to it. If its last statement acquired a conflicting lock, DDL can queue behind it as well.

Connection count alone misses this risk. Alert on the age and consequences of the transaction.

## Measure the right two ages

Use `xact_start` for the transaction's lifetime and `state_change` for how long the backend has been in its current idle state:

```sql
SELECT pid,
       datname,
       usename,
       application_name,
       client_addr,
       state,
       clock_timestamp() - xact_start AS transaction_age,
       clock_timestamp() - state_change AS idle_state_age,
       backend_xid,
       backend_xmin,
       wait_event_type,
       wait_event,
       left(query, 300) AS last_query
FROM pg_stat_activity
WHERE state IN ('idle in transaction',
                'idle in transaction (aborted)')
ORDER BY xact_start;
```

`query_start` is the start of the last query when a session is not active, so it is not the cleanest idle-duration clock. `backend_xmin` identifies a retained visibility horizon when one exists, but a null value does not prove an `idle in transaction` session is harmless: the transaction can still hold locks. For `idle in transaction (aborted)`, use `state_change` to age the failed state; the transaction itself has already aborted, so `xact_start`, `backend_xid`, and `backend_xmin` can be null.

A monitoring role needs `pg_read_all_stats` or superuser access to see all activity fields for other users' sessions; without it, security-restricted columns can be null.

Run the monitor as a short autocommit query. PostgreSQL holds current activity information stable after its first access inside a monitoring transaction, so a poller that leaves its own transaction open can report stale state and activity timestamps. `clock_timestamp()` still advances, so calculated ages can continue growing from those stale timestamps.

## Find actual blocking impact

An old transaction deserves attention; one that blocks another backend deserves faster escalation:

```sql
WITH waiters AS (
  SELECT a.pid AS waiter_pid,
         a.query_start AS waiter_query_start,
         blocker_pid
  FROM pg_stat_activity AS a
  CROSS JOIN LATERAL unnest(pg_blocking_pids(a.pid)) AS b(blocker_pid)
)
SELECT w.waiter_pid,
       clock_timestamp() - w.waiter_query_start AS waiter_query_age,
       w.blocker_pid,
       blocker.state AS blocker_state,
       clock_timestamp() - blocker.xact_start AS blocker_xact_age,
       blocker.usename AS blocker_user,
       blocker.application_name AS blocker_application
FROM waiters AS w
LEFT JOIN pg_stat_activity AS blocker
  ON blocker.pid = w.blocker_pid
ORDER BY w.waiter_query_start;
```

`waiter_query_age` is the current statement's age and only an upper bound on how long it has waited for a lock; use `pg_locks.waitstart` when you need the heavyweight-lock wait start time.

`pg_blocking_pids()` includes both a session holding a conflicting lock and a session ahead in the lock wait queue whose requested lock conflicts with the waiter's request. A blocker PID of zero represents a prepared transaction; it will not have a `pg_stat_activity` row, so inspect `pg_prepared_xacts`.

For vacuum impact, correlate old transactions with estimated dead-tuple counts and maintenance recency:

```sql
SELECT schemaname,
       relname,
       n_dead_tup,
       last_autovacuum,
       autovacuum_count,
       vacuum_count
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC
LIMIT 20;
```

This is correlation, not proof that one backend pins every dead tuple in a table. Use it to prioritize investigation rather than to attribute exact bloat.

## Build alerts in stages

Start with thresholds tied to application behavior, not an arbitrary universal number. A typical policy might be:

- Warning when idle state age exceeds the longest expected think time or request timeout.
- Critical when transaction age exceeds a maintenance-risk threshold.
- Immediate page when the session appears as a blocker for production work.
- Separate alert for `idle in transaction (aborted)`, which usually means the client failed to roll back after an error.

Export aggregate values such as count, maximum age, and blocked-waiter count. Keep database, application, and perhaps user as bounded labels. Do not attach the full last query, PID, client address, or transaction start time to a Prometheus label; those cause cardinality growth and can expose sensitive SQL.

Alert on sustained conditions across several scrapes. A transaction can briefly enter this state between two statements without being faulty.

## Apply a server-side safety net

`idle_in_transaction_session_timeout` terminates a session that remains idle inside an open transaction beyond the configured duration. Apply it narrowly to the application role after testing retry and connection-pool behavior:

```sql
ALTER ROLE checkout_app
  SET idle_in_transaction_session_timeout = '5min';
```

New sessions for that role inherit the setting. Existing sessions do not retroactively receive a role default; reconnect them or use `SET` in the session. A value of zero disables the timeout.

Choose a value longer than valid pauses in the application's transaction flow. The client receives a closed connection, so confirm that the driver discards it and that business operations handle rollback and retry safely. This timeout is a guardrail, not a substitute for putting `COMMIT` and `ROLLBACK` in `finally`/defer paths.

`statement_timeout` limits statement execution, not the client pause after a statement. `lock_timeout` limits an individual lock acquisition attempt, not how long a blocker keeps a lock. They solve different failure modes.

## Respond without making the incident worse

Contact the owning application first when possible. For an idle session, `pg_cancel_backend()` has no currently executing statement to cancel. Ending the session requires `pg_terminate_backend()` and rolls back its transaction:

```sql
SELECT pg_terminate_backend(12345, 5000);
```

The optional timeout waits for termination confirmation on supported PostgreSQL versions. Signal privileges are restricted; `pg_signal_backend` does not permit signaling a superuser-owned backend. Never automate termination based only on age. Exclude migrations, maintenance roles, and known operator sessions, and require evidence of blocking or an approved hard limit.

After an incident, fix the cause:

- missing commit or rollback on an exception path;
- streaming or remote work performed inside a database transaction;
- manual clients left after `BEGIN`;
- a pool returning a connection with an open transaction;
- application cancellation that abandons the server transaction.

Track `application_name` in connection strings so ownership is visible without parsing SQL.

## Official Documentation

- [PostgreSQL `pg_stat_activity`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW)
- [PostgreSQL client connection timeouts](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL routine vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- [PostgreSQL session information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL server signaling functions](https://www.postgresql.org/docs/current/functions-admin.html)

## Conclusion

Alert on `idle in transaction` with both `state_change` and `xact_start`, then raise urgency when the session blocks work or retains an old visibility horizon. Use a carefully scoped `idle_in_transaction_session_timeout` as a last line of defense, while fixing transaction ownership and cleanup in the application.
