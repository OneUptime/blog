# Why Does `pg_stat_activity` Look Frozen? Refreshing PostgreSQL Statistics Snapshots Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pg_stat_activity, Statistics, Database Monitoring, Troubleshooting

Description: Diagnose apparently frozen PostgreSQL activity views by separating transaction-scoped snapshots from collection lag and refreshing them without losing a coherent monitoring sample.

---

`pg_stat_activity` can appear to show the same query, state, or timestamp long after the workload changed. That does not necessarily mean PostgreSQL stopped collecting activity. The most common cause is the transaction used by the monitoring session itself.

PostgreSQL takes a consistent view of current-session information the first time it is requested inside a transaction and shows that same information for the rest of the transaction. Cumulative statistics have related caching behavior. This lets several diagnostic queries correlate against one observation, but it surprises dashboards, scripts, and interactive sessions that leave a transaction open.

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

The second result can repeat the first activity snapshot. `now()` is a poor clock for this experiment because it is also fixed at transaction start; use `clock_timestamp()` to prove that wall-clock time advanced.

In `psql`, check whether the prompt ends in `*` and inspect:

```sql
SELECT txid_current_if_assigned(),
       now() AS transaction_time,
       clock_timestamp() AS wall_time;
```

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

`stats_fetch_consistency` controls caching for cumulative statistics. Its `snapshot` setting caches all accessed statistics together, `cache` caches values as they are accessed, and `none` avoids that caching. It does not turn `pg_stat_activity` into a continuously updating stream inside one result set. Short polling transactions remain the simplest monitoring contract.

## Distinguish snapshots from collection lag

PostgreSQL documents two different data paths:

- Current-query information reported through `track_activities` is dynamic.
- Cumulative counters are accumulated locally by each server process and flushed to shared memory at intervals, ordinarily when that process is about to go idle and not more often than the build-time statistics interval.

Therefore a static `pg_stat_activity` row inside a long monitoring transaction is a snapshot issue, while a slightly delayed table or I/O counter can be normal collection lag. A query or transaction that is still running also has not contributed all its eventual work to cumulative totals.

Check configuration before blaming the collector:

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('track_activities', 'track_counts', 'stats_fetch_consistency');
```

If `track_activities` is disabled in a target backend, its state is reported as `disabled`. That is different from a cached row.

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

Run this as one autocommit statement. Avoid using raw query text as a metric label; it is sensitive and unbounded.

## Account for visibility and sampling

An ordinary role sees complete details for its own sessions, but sensitive columns for other users can be null. A monitoring role normally needs `pg_read_all_stats` or the broader predefined `pg_monitor` role. A permission problem can look like missing activity, but it does not freeze timestamps.

Activity is sampled, not an event history. A statement that begins and ends between polls will not appear. Use `pg_stat_statements`, logs, or tracing for historical query behavior, and reserve `pg_stat_activity` for the server's current state.

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
