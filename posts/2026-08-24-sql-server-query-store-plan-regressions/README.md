# How to Detect SQL Server Plan Regressions by Comparing Query Store Runtime Intervals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Query Store, Execution Plans, Performance Regression, Query Tuning

Description: Detect plan regressions with correctly aggregated Query Store intervals, execution-weighted latency and CPU, minimum-volume gates, and plan-change evidence.

---

Query Store preserves plans and aggregated runtime statistics across time windows, making it a strong source for regression detection. The comparison is only valid when rows inside each interval are aggregated correctly and averages are weighted by execution count.

## Normalize one row per plan and interval

`sys.query_store_runtime_stats` can contain more than one row for the same plan, execution type, and currently active interval—typically persisted data plus an in-memory row. Microsoft therefore requires aggregation by `plan_id`, `execution_type`, and `runtime_stats_interval_id` to get the actual interval state.

This version-compatible query produces that shape:

```sql
WITH per_interval AS (
  SELECT p.query_id,
         rs.plan_id,
         p.query_plan_hash,
         rs.execution_type,
         rs.execution_type_desc,
         rs.runtime_stats_interval_id,
         i.start_time,
         i.end_time,
         SUM(rs.count_executions) AS executions,
         SUM(CONVERT(float, rs.avg_duration) * rs.count_executions)
           / NULLIF(SUM(rs.count_executions), 0) AS avg_duration_us,
         SUM(CONVERT(float, rs.avg_cpu_time) * rs.count_executions)
           / NULLIF(SUM(rs.count_executions), 0) AS avg_cpu_us,
         SUM(CONVERT(float, rs.avg_logical_io_reads) * rs.count_executions)
           / NULLIF(SUM(rs.count_executions), 0) AS avg_logical_reads
  FROM sys.query_store_runtime_stats AS rs
  JOIN sys.query_store_runtime_stats_interval AS i
    ON i.runtime_stats_interval_id = rs.runtime_stats_interval_id
  JOIN sys.query_store_plan AS p
    ON p.plan_id = rs.plan_id
  WHERE i.start_time >= DATEADD(day, -2, SYSUTCDATETIME())
  GROUP BY p.query_id,
           rs.plan_id,
           p.query_plan_hash,
           rs.execution_type,
           rs.execution_type_desc,
           rs.runtime_stats_interval_id,
           i.start_time,
           i.end_time
)
SELECT *
FROM per_interval
ORDER BY end_time DESC, avg_duration_us DESC;
```

Durations and CPU fields are in microseconds; logical reads are page counts. The multiplication by `count_executions` is essential. `AVG(avg_duration)` gives a lightly used row the same weight as a row with thousands of executions.

Keep `execution_type` separate. Normal, aborted, and exception executions describe different populations; most latency regressions start with `execution_type = 0`, while error-rate monitoring should retain the others.

## Compare completed, comparable windows

The currently active interval is incomplete and can change between samples. For alerts, compare completed intervals or an explicitly delayed recent window against a baseline such as the same hour on previous weekdays.

For each query and plan, retain:

```text
executions
weighted average duration
weighted average CPU
weighted average logical reads
maximum duration
row-count distribution where available
plan hash and plan ID
```

Require minimum recent executions and an absolute latency increase as well as a ratio. A plan that rises from 50 microseconds to 100 microseconds has a 2× ratio but may be operationally irrelevant; a plan with one execution has little statistical support.

A practical candidate policy is:

```text
recent_executions >= workload_minimum
recent_avg_duration >= absolute_latency_floor
recent_avg_duration / baseline_avg_duration >= regression_ratio
recent_total_duration is material to the service
```

Use medians or robust historical bands in the monitoring backend when workload has strong seasonality. Query Store's interval averages alone do not supply raw per-execution percentiles.

## Prove whether the plan changed

Join a candidate to query and query-text metadata only during diagnosis:

```sql
SELECT q.query_id,
       q.query_hash,
       p.plan_id,
       p.query_plan_hash,
       p.is_forced_plan,
       p.force_failure_count,
       p.last_force_failure_reason_desc,
       qt.query_sql_text,
       p.query_plan
FROM sys.query_store_query AS q
JOIN sys.query_store_query_text AS qt
  ON qt.query_text_id = q.query_text_id
JOIN sys.query_store_plan AS p
  ON p.query_id = q.query_id
WHERE q.query_id = @query_id
ORDER BY p.last_execution_time DESC;
```

If a new `plan_id` or `query_plan_hash` coincides with worse duration, CPU, or reads for the same query, a plan regression is plausible. Inspect estimates, join order, access paths, memory grants, spills, parameter sensitivity, statistics changes, compatibility-level changes, and indexes.

A plan change is not required for a latency regression. The same plan can slow because data volume, parameters, concurrency, blocking, memory, storage, or replica role changed. Conversely, a new plan can be beneficial. Treat plan identity as evidence, not the alert by itself.

## Handle resets, cleanup, and replicas

Query Store can remove old data through retention and size cleanup, so a missing baseline is “unknown,” not zero. State and quota monitoring must accompany regression detection.

Capture is asynchronous, and the active interval can have both memory and disk rows. Delay evaluation, aggregate as shown above, and annotate Query Store configuration changes.

On versions that support Query Store for readable secondaries, runtime statistics include `replica_group_id`. Add it to every grouping and comparison so primary and secondary role workloads are not averaged together. Failover changes roles, and their performance characteristics can differ.

Query text and plan XML can expose schema names, literals, or business details. Keep them out of routine metric labels, restrict permissions, and fetch them only through an audited diagnostic path. SQL Server 2022 and later use `VIEW DATABASE PERFORMANCE STATE` for these views; earlier supported versions use `VIEW DATABASE STATE`.

## Remediate as a controlled change

Before forcing a previous plan or applying a Query Store hint:

1. replay or canary the candidate with representative parameters;
2. confirm that the baseline plan remains valid for current data and indexes;
3. check whether a forced plan already exists or previously failed;
4. define rollback and monitor execution, CPU, reads, waits, and errors;
5. fix underlying statistics, indexing, or query design when appropriate.

Plan forcing is mitigation, not proof of root cause. A previously good plan can become unsafe as data distribution changes.

## Official Documentation

- [SQL Server `sys.query_store_runtime_stats`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17)
- [SQL Server `sys.query_store_runtime_stats_interval`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-interval-transact-sql?view=sql-server-ver17)
- [SQL Server `sys.query_store_plan`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-plan-transact-sql?view=sql-server-ver17)
- [Monitor performance with Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17)
- [Query Store usage scenarios](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-usage-scenarios?view=sql-server-ver17)

## Conclusion

Aggregate Query Store rows by plan, execution type, and interval; calculate execution-weighted averages; and compare completed windows with meaningful volume and latency floors. A coincident plan hash change strengthens the diagnosis, but workload, waits, and resource evidence must still rule out a regression in the environment rather than the plan.
