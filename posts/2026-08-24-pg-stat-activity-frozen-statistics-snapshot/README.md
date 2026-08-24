# Refresh Frozen `pg_stat_activity` Statistics Snapshots Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pg_stat_activity, Statistics, Database Monitoring, Troubleshooting

Description: Diagnose apparently frozen PostgreSQL activity views by separating transaction-scoped snapshots from collection lag and refreshing them without losing a coherent monitoring sample.

---

`pg_stat_activity` can appear to show the same query, state, or timestamp long after the workload changed. That does not necessarily mean PostgreSQL stopped collecting activity. A common cause is a transaction left open by the monitoring session itself.

PostgreSQL collects current-query information for all sessions the first time such information is requested inside a transaction and reuses that snapshot for the rest of the transaction. Cumulative statistics have related caching behavior. This lets several diagnostic queries correlate against one observation, but it surprises dashboards, scripts, and interactive sessions that leave a transaction open.

## Recognize a transaction-scoped snapshot

This is an easy way to reproduce the effect:

```sql
BEGIN;

SELECT clock_timestamp() AS observed_at,
       pid,
       state,
       query_start,
       state_change,
       wait_event_type,
       wait_event,
       query
FROM pg_stat_activity
WHERE pid <> pg_backend_pid();

-- Wait while another session changes state, then run the SELECT again.
```

The second result can repeat the first activity snapshot. Do not assume every column freezes together: wait-event data is not synchronized with state data and can change independently. `now()` is a poor clock for this experiment because it is also fixed at transaction start; use `clock_timestamp()` to prove that wall-clock time advanced.

In `psql`'s default primary prompt, the `%x` status character before the final `#` or `>` is `*` in an open transaction block and `!` in a failed transaction block. Inspect:

```sql
SELECT pg_current_xact_id_if_assigned() AS assigned_xid,
       now() AS transaction_time,
       clock_timestamp() AS wall_time;
```

`assigned_xid` can be `NULL` in an open read-only transaction, so do not use it alone to decide whether a transaction is open.

A monitoring query should normally run in autocommit mode so every poll is a short transaction. Also check the driver or framework: a pool can disable autocommit, and a transaction begun for one poll can accidentally survive across many polls.

## Refresh intentionally

The cleanest fix is to end the transaction:

```sql
COMMIT; -- or ROLLBACK

SELECT clock_timestamp() AS observed_at, pid, state, query
FROM pg_stat_activity;
```

When several queries must remain in the same transaction but a fresh observation is explicitly required, clear the cached statistics snapshot:

```sql
SELECT pg_stat_clear_snapshot();

SELECT clock_timestamp() AS observed_at,
       pid,
       state,
       wait_event_type,
       wait_event,
       query
FROM pg_stat_activity;
```

This deliberately gives up correlation with the earlier snapshot. Do not clear between every query in a multi-view diagnostic report unless skew between observations is acceptable.

In PostgreSQL 15 and later, `stats_fetch_consistency` controls caching for cumulative statistics. Its `snapshot` setting caches all cumulative statistics accessible in the current database on first access, `cache` caches statistics for each object when first accessed, and `none` re-fetches counters on every access. It does not control `pg_stat_activity`'s separate transaction-scoped activity snapshot. Short polling transactions remain the simplest monitoring contract.

## Distinguish snapshots from collection lag

PostgreSQL documents two different data paths:

- Current-query information reported through `track_activities` is dynamic.
- In PostgreSQL 15 and later, cumulative counters are accumulated locally by each server process and flushed to shared memory just before that process goes idle, but not more frequently than once per `PGSTAT_MIN_INTERVAL` (normally one second unless changed when PostgreSQL is built).

Therefore a static `pg_stat_activity` row inside a long monitoring transaction is a snapshot issue, while a slightly delayed table or I/O counter can be normal collection lag. A query or transaction that is still running does not yet affect the ordinary cumulative-statistics views; the `pg_stat_xact_*` views are an exception for the current transaction's own statistics.

Check the monitoring session's effective configuration before blaming the statistics system:

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('track_activities', 'track_counts', 'stats_fetch_consistency');
```

`pg_settings` reports values effective in the session that runs the query. Because `track_activities` can be changed per session, a target backend's direct signal is its state: if tracking is disabled there, its state is reported as `disabled`. That is different from a cached row.

## Interpret the timestamps correctly

Several fields answer different questions:

- `backend_start` is when the backend started; for a client backend, this is connection time.
- `xact_start` is when the current transaction began, or `NULL` when no transaction is active.
- `query_start` is the current query start while active, but the last query start while not active.
- `state_change` is when the backend last changed state.

To alert on a currently active query, measure from `query_start`. To alert on `idle in transaction`, show both transaction age and time in that state:

```sql
SELECT pid,
       usename,
       application_name,
       state,
       clock_timestamp() - xact_start AS transaction_age,
       clock_timestamp() - state_change AS state_age,
       wait_event_type,
       wait_event
FROM pg_stat_activity
WHERE state IN ('active', 'idle in transaction',
                'idle in transaction (aborted)');
```

Run this as one autocommit statement. Avoid using raw query text as a metric label; it is sensitive and creates unbounded label cardinality.

## Account for visibility and sampling

An ordinary role sees complete details for its own sessions and sessions belonging to roles it is a member of, but sensitive columns for unrelated sessions can be null. A monitoring role normally needs `pg_read_all_stats` or the broader predefined `pg_monitor` role. A permission problem can look like missing activity, but it does not freeze timestamps.

Polling `pg_stat_activity` samples current state rather than recording an event history. A statement that begins and ends between polls may never be observed as active, although its text can remain as a backend's last query. Use `pg_stat_statements` for aggregated statement behavior and logs or tracing for individual execution history, and reserve `pg_stat_activity` for the server's current state.

For a reliable poller:

1. Open or borrow a connection.
2. Execute one bounded query in autocommit mode.
3. Record `clock_timestamp()` from the server with the sample.
4. Return the connection with no open transaction.
5. Track scrape duration and errors so an old dashboard value is distinguishable from a successful unchanged sample.

## Official Documentation

- [PostgreSQL cumulative statistics and activity views](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL date and time functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL predefined monitoring roles](https://www.postgresql.org/docs/current/predefined-roles.html)
- [PostgreSQL transaction control](https://www.postgresql.org/docs/current/tutorial-transactions.html)

## Conclusion

When `pg_stat_activity` looks frozen, first inspect the monitoring session's transaction boundary and compare `now()` with `clock_timestamp()`. Use short autocommit polls, or call `pg_stat_clear_snapshot()` only when a deliberate mid-transaction refresh is worth losing snapshot consistency. Then investigate configuration, permissions, and scrape failures as separate causes.
