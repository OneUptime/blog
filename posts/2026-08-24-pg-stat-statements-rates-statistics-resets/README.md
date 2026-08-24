# How to Calculate `pg_stat_statements` Rates Without False Spikes After Statistics Resets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pg_stat_statements, Prometheus, Counter Resets, Query Performance

Description: Derive trustworthy per-query rates from `pg_stat_statements` by preserving reset epochs, detecting entry churn, and refusing invalid deltas.

---

The counters in `pg_stat_statements` are cumulative, not interval measurements. `calls`, execution time, rows, and block counts grow for an entry until statistics are reset, the entry is deallocated, the server loses statistics after an unclean shutdown or a restart with `pg_stat_statements.save` disabled, or an operational change gives the query a different identity.

Subtracting any two samples without recognizing those boundaries creates impossible negative values or false positive spikes. A correct rate pipeline treats every continuous counter epoch separately.

## Record identity and reset metadata together

Sample the view once per PostgreSQL instance, connecting to a database where the extension is installed; the module tracks statements across all databases on that server. On PostgreSQL 17 and later, include both the module-wide reset timestamp and the entry's `stats_since` timestamp:

```sql
SELECT statement_timestamp() AS sampled_at,
       d.datname,
       i.stats_reset,
       i.dealloc,
       s.userid,
       s.dbid,
       s.toplevel,
       s.queryid,
       s.stats_since,
       s.calls,
       s.total_plan_time,
       s.total_exec_time,
       s.rows,
       s.shared_blks_hit,
       s.shared_blks_read,
       s.temp_blks_read,
       s.temp_blks_written,
       s.wal_bytes
FROM pg_stat_statements AS s
LEFT JOIN pg_database AS d ON d.oid = s.dbid
CROSS JOIN pg_stat_statements_info AS i;
```

`statement_timestamp()` gives every row returned by one collection query the same sample time. Also collect `pg_stat_statements_info` as its own one-row sample so reset and deallocation telemetry remains available when `pg_stat_statements` has no entries. The collector must be a superuser or have the privileges of `pg_read_all_stats`; otherwise `queryid` is null for statements executed by other users and cannot serve as part of a unique series identity.

The columns available depend on the PostgreSQL and extension version. `stats_since` was added in PostgreSQL 17; it changes when an entry is recreated or its full statistics are reset. Planning counters require `pg_stat_statements.track_planning` to be enabled to contain meaningful work, and newer releases expose fields that old releases do not. Generate the collector query for the deployed extension schema rather than assuming a query written for PostgreSQL 18 runs unchanged on every supported server.

Use an instance identifier plus `dbid`, `userid`, `toplevel`, and `queryid` as the series identity. PostgreSQL explicitly does not promise that `queryid` remains stable across major versions, so start a new epoch across a major upgrade. Database and role OIDs can also differ after logical migration or restore.

## Reject discontinuous deltas

On PostgreSQL 17 and later, suppose `monitoring.pgss_samples` stores the preceding fields plus `instance_id`, a monotonically increasing per-instance `scrape_seq`, and a non-null collector-assigned `generation` that changes at the continuity boundaries described below. A reset-aware calls-per-second calculation is:

```sql
WITH ordered AS (
  SELECT *,
         lag(sampled_at) OVER w AS previous_at,
         lag(stats_reset) OVER w AS previous_reset,
         lag(stats_since) OVER w AS previous_stats_since,
         lag(calls) OVER w AS previous_calls,
         lag(total_exec_time) OVER w AS previous_exec_ms
  FROM monitoring.pgss_samples
  WINDOW w AS (
    PARTITION BY instance_id, dbid, userid, toplevel, queryid, generation
    ORDER BY scrape_seq
  )
)
SELECT sampled_at,
       scrape_seq,
       instance_id,
       dbid,
       userid,
       toplevel,
       queryid,
       generation,
       CASE
         WHEN stats_reset = previous_reset
          AND stats_since = previous_stats_since
          AND calls >= previous_calls
          AND sampled_at > previous_at
         THEN (calls - previous_calls)::numeric
              / extract(epoch FROM sampled_at - previous_at)
       END AS calls_per_second,
       CASE
         WHEN stats_reset = previous_reset
          AND stats_since = previous_stats_since
          AND total_exec_time >= previous_exec_ms
          AND sampled_at > previous_at
         THEN (total_exec_time - previous_exec_ms) / 1000.0
              / extract(epoch FROM sampled_at - previous_at)
       END AS database_exec_seconds_per_second
FROM ordered;
```

Partitioning by `generation` leaves the first sample after a boundary without a predecessor. Return `NULL` across a boundary instead of zero. Zero means a valid interval with no increase; null means the rate is unknown. Apply the monotonic check independently to every counter used in a calculation.

`total_exec_time` is milliseconds accumulated across executions. Dividing its valid delta by 1000 and then by wall seconds gives database execution seconds per wall second. That value can exceed one when queries run concurrently, so it is not a CPU-utilization percentage.

## Handle disappearance and reappearance

`pg_stat_statements.max` bounds the number of tracked entries. When more distinct statements are observed, the least-executed entries can be deallocated. `pg_stat_statements_info.dealloc` counts those events. Alert on its increase because heavy deallocation means query histories are being lost.

If a query disappears for one sample and later returns, do not bridge the gap. Start a new local series epoch even when the global `stats_reset` value did not change. A collector can enforce this with a generation number that increments after:

- a changed `stats_reset` timestamp;
- a changed per-entry `stats_since` timestamp on PostgreSQL 17 and later;
- a counter decrease;
- a server restart or monitored-instance replacement;
- an observed absence in a successful scrape, or a whole-scrape gap beyond the allowed interval;
- a PostgreSQL major upgrade.

The `dealloc` count is global and does not identify which entry was evicted. It is evidence of churn, not enough to repair a particular missing series. Before PostgreSQL 17, eviction and recreation can happen between scrapes without an observed absence or counter decrease. If `dealloc` changes during an interval, conservatively reject all per-entry deltas on those releases when false rates are unacceptable.

## Understand each kind of reset

`SELECT pg_stat_statements_reset()` can reset all entries or a subset selected by user, database, and query ID. A selective reset does not update the module-wide `pg_stat_statements_info.stats_reset` unless all statistics are discarded. On PostgreSQL 17 and later, detect the affected entry through its changed `stats_since` value. On older releases, a counter decrease cannot detect a reset that rebounds past the prior value between scrapes, so record known resets out of band or conservatively start a new epoch after an unexplained gap.

PostgreSQL 17 and later also support `minmax_only => true`, which resets minimum and maximum planning and execution time without resetting totals. The per-entry `minmax_stats_since` column records that boundary. Do not use a change in minimum or maximum as evidence that cumulative `calls` or `total_exec_time` reset.

An unclean server shutdown, start from a base backup, or point-in-time recovery resets PostgreSQL cumulative statistics generally. Keep server start and scrape-success telemetry alongside query metrics so operators can explain a synchronized change.

## Prometheus considerations

Prometheus `rate()` automatically adjusts an observed decrease within one time series, but it still calculates a rate across that reset and cannot detect a reset that rebounds above the previous sample. It cannot associate different label sets or distinguish an identical label set that disappears and later represents a recreated entry. To preserve strict continuity epochs, include the collector generation in the series labels or export collector-validated rates as gauges. Export only monotonic cumulative fields as counters, and expose reset metadata and deallocation as separate metrics.

Avoid `query` as a label. Even normalized text can be long and high-cardinality, and query text may expose identifiers or literals depending on how it was generated. If per-query metrics are exported, use identity and epoch labels only under an explicit cardinality budget; `pg_stat_statements.max` bounds current entries, not the Prometheus series created over time. Place sanitized text in a separate lookup keyed by the complete entry identity and generation. Remember that two semantically different statements can share a normalized entry, while identical text can have different identities under different roles, databases, search paths, or top-level settings.

Useful alerts include:

- the increase in `dealloc` over a window;
- missing `pg_stat_statements_info` or collector errors;
- an unexpected global reset;
- a high rate of new query IDs;
- time spent by a query only after a minimum call-rate threshold is met.

## Validate the pipeline

In staging, execute a known query repeatedly, take two samples, reset its entry, and take another two. Verify that:

1. the first pair produces the expected positive rate;
2. the interval crossing the reset is null;
3. the next continuous pair produces a rate again;
4. a missing scrape does not divide by the nominal scrape interval;
5. a PostgreSQL restart begins a new epoch;
6. query text never becomes a metric label.

Use actual `sampled_at` differences rather than assuming the scheduler ran exactly on time.

## Official Documentation

- [PostgreSQL `pg_stat_statements`](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL cumulative statistics behavior](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL `compute_query_id`](https://www.postgresql.org/docs/current/runtime-config-statistics.html#GUC-COMPUTE-QUERY-ID)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)

## Conclusion

Treat `pg_stat_statements` values as counters inside explicit continuity epochs. Store the reset timestamp and complete query identity with every sample, reject deltas across resets, decreases, long gaps, and upgrades, and monitor deallocation. An unknown boundary should produce no rate, never a spike.
