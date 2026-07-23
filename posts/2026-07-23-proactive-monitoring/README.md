# How to Monitor SQL Server Before Users Report a Performance Problem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Monitoring, Query Store, Performance, Observability

Description: Build a low-overhead SQL Server monitoring baseline that detects workload regressions, contention, resource pressure, and recovery risk early.

---

Proactive SQL Server monitoring is not a wall of current values. It is a time-aligned history of user experience, workload, waits, resources, database health, and recoverability—with enough context to distinguish a real regression from normal business load.

Start from service objectives, collect small consistent samples, preserve important events, and attach every alert to a diagnostic runbook.

## Monitor the User Outcome First

Define service indicators for each workload:

- transaction or API latency by percentile, not only average;
- success, timeout, and deadlock-victim rates;
- throughput and queue depth;
- reporting or batch completion deadlines;
- data freshness and availability-replica lag;
- newest tested recovery point and backup age.

Database CPU at 80 percent can be healthy during a planned batch, while five percent CPU can coexist with severe blocking. Pair symptom alerts with database context and a workload baseline.

## Establish a Versioned Baseline

Record SQL Server build, edition, host resources, database compatibility levels, configuration, file layout, and enabled features. Mark deployments, failovers, statistics maintenance, index changes, and business events on the same timeline as metrics.

Build baselines for normal hourly, daily, weekly, and seasonal periods. Retain distributions and rates, not just point values. Avoid universal thresholds for page life expectancy, cache hit ratio, or wait counts; interpret them with server memory, workload, uptime, and trend.

```sql
SELECT
    sqlserver_start_time,
    cpu_count,
    scheduler_count,
    physical_memory_kb / 1024 AS physical_memory_mb
FROM sys.dm_os_sys_info;
```

The start time matters because many DMV counters reset on restart.

## Collect Wait Statistics as Deltas

Wait statistics classify where completed waits accumulated:

```sql
SELECT
    wait_type,
    waiting_tasks_count,
    wait_time_ms,
    signal_wait_time_ms
FROM sys.dm_os_wait_stats;
```

These values are cumulative since startup or the last manual reset. Store timestamped snapshots and calculate deltas in the monitoring system. Preserve the startup time with each snapshot and use a documented exclusion list for benign idle/queue waits appropriate to the version.

Use waits to select the next investigation, not as an automatic diagnosis:

- lock waits point toward concurrency and transaction analysis;
- page I/O latch waits warrant storage latency and read-volume review;
- scheduler-yield and signal wait patterns warrant CPU/query review;
- memory-grant waits warrant query grants, estimates, and concurrency review;
- `ASYNC_NETWORK_IO` can mean a slow result consumer or network path.

Correlate instance waits with current/session waits and Query Store wait categories where supported.

## Track CPU, Memory, I/O, and Worker Pressure

Collect both operating-system and SQL Server metrics. Useful groups include:

- host and SQL Server process CPU;
- runnable tasks, worker use, batch requests, compilations, and recompilations;
- OS available memory, SQL process memory, grants pending, and paging;
- data/log read and write latency and throughput by file;
- storage volume free capacity and autogrowth;
- TempDB allocation, version-store space, and spills;
- network throughput and client-consumption waits.

File I/O counters are cumulative, so calculate deltas over the sample interval:

```sql
SELECT
    DB_NAME(vfs.database_id) AS database_name,
    mf.type_desc,
    mf.name AS logical_file_name,
    mf.physical_name,
    vfs.num_of_reads,
    vfs.io_stall_read_ms,
    vfs.num_of_writes,
    vfs.io_stall_write_ms,
    vfs.num_of_bytes_read,
    vfs.num_of_bytes_written
FROM sys.dm_io_virtual_file_stats(NULL, NULL) AS vfs
JOIN sys.master_files AS mf
  ON mf.database_id = vfs.database_id
 AND mf.file_id = vfs.file_id;
```

Do not compare a cumulative lifetime average with a five-minute incident. Store two snapshots and calculate interval latency from the differences in stall time and operation count. Keep storage telemetry from the underlying volume too; SQL Server can show waits without explaining a SAN, cloud-disk, or filesystem event.

## Make Query Store the Regression Record

For SQL Server 2016 and later, Query Store can retain query texts, plans, and runtime statistics across plan-cache eviction and restart. Starting with SQL Server 2022, it is enabled by default for newly created databases, but upgraded and older databases require explicit state verification.

```sql
SELECT
    actual_state_desc,
    desired_state_desc,
    readonly_reason,
    current_storage_size_mb,
    max_storage_size_mb,
    interval_length_minutes,
    stale_query_threshold_days
FROM sys.database_query_store_options;
```

Alert when Query Store becomes read-only unexpectedly or approaches capacity. Choose capture and cleanup policies from workload volume; indiscriminate capture can consume space, while overly narrow capture can omit the regression.

Use Query Store to trend:

- weighted duration, CPU, logical reads, writes, and memory by query and plan;
- execution count and maximum/tail behavior per interval;
- plan changes after deployments or statistics updates;
- runtime variability that can indicate parameter-sensitive behavior;
- forced-plan success/failure and, on SQL Server 2022 and later, Query Store hint success/failure.

Keep query text and plans under sensitive-data controls. They can expose object names and literal values.

## Capture Events That Polling Misses

Short events can disappear between samples. SQL Server's `system_health` Extended Events session runs by default and captures useful diagnostics including deadlock reports. Use narrowly scoped Extended Events sessions for additional needs such as:

- blocked process reports after configuring an appropriate threshold;
- selected errors and severity levels;
- long-running RPC or batch completion with database/application filters;
- query spills or warnings when a specific investigation requires them;
- availability-group and backup failures.

Write bounded rollover event files to a monitored volume and secure them. Do not leave a broad statement capture running indefinitely without measuring overhead and data exposure. SQL Trace and Profiler are deprecated for this role; use Extended Events.

## Monitor Capacity and Recoverability

Performance monitoring that ignores recovery is incomplete. Alert on:

- database state, suspect pages, and SQL Server error-log I/O errors;
- data, log, TempDB, and backup-volume free capacity;
- file autogrowth frequency and duration;
- transaction-log used percentage and `log_reuse_wait_desc`;
- age of the full, differential, and log backups required by the recovery model and restore strategy against RPO;
- backup transfer/retention and encryption-key availability;
- last successful isolated restore and `DBCC CHECKDB` evidence;
- SQL Server Agent failures and jobs running beyond their baseline;
- availability replica disconnect, suspension, send queue, redo queue, and estimated recovery exposure.

An availability group can be green while the backup chain is stale, and a successful backup job can write media that no restore process can access. Measure the recoverable outcome.

## Keep a Lightweight Incident Snapshot

When an alert fires, collect current requests before they disappear:

```sql
SELECT
    r.session_id,
    r.blocking_session_id,
    r.status,
    r.command,
    r.wait_type,
    r.wait_time,
    r.wait_resource,
    r.cpu_time,
    r.logical_reads,
    r.writes,
    r.total_elapsed_time,
    DB_NAME(r.database_id) AS database_name,
    s.host_name,
    s.program_name,
    s.login_name
FROM sys.dm_exec_requests AS r
JOIN sys.dm_exec_sessions AS s
  ON s.session_id = r.session_id
WHERE r.session_id <> @@SPID;
```

Store the associated query text only when permissions, retention, and sensitive-data policy allow it. A useful alert bundle includes the time range, affected service, deployment marker, top changed queries, blocking head, wait deltas, resource saturation, file latency, capacity, and replica/backup state.

## Design Alerts for Action

Use multi-signal and sustained conditions where possible. For example, page I/O latch waits plus rising file read latency plus application latency is more actionable than a one-second storage spike. Every alert should state:

- why it matters and which objective is at risk;
- current value, baseline, and duration;
- likely first diagnostic queries or dashboards;
- owner and escalation path;
- safe containment options and prohibited shortcuts;
- link to recent changes and recovery state.

Test alert delivery and runbooks during planned fault exercises. Track false positives and missed incidents, then tune the condition—not by hiding the metric, but by improving its context.

## Grant Monitoring Access Deliberately

Many server-scoped DMVs require `VIEW SERVER STATE` on SQL Server 2019 and earlier. Starting with SQL Server 2022, many performance DMVs instead require `VIEW SERVER PERFORMANCE STATE`. Grant only the target-version permissions the collector needs, protect its credential, and review its access to query text and security-sensitive state.

Finally, monitor the monitor: sample lag, dropped events, Query Store state, collector errors, clock skew, storage use, and alert-delivery failure should all be visible before the next SQL Server incident.

## Official Documentation

- [Monitor and tune for performance](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitor-and-tune-for-performance?view=sql-server-ver17)
- [Performance monitoring and tuning tools](https://learn.microsoft.com/en-us/sql/relational-databases/performance/performance-monitoring-and-tuning-tools?view=sql-server-ver17)
- [Monitor performance by using Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17)
- [sys.dm_os_wait_stats](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-os-wait-stats-transact-sql?view=sql-server-ver17)
- [Performance Dashboard](https://learn.microsoft.com/en-us/sql/relational-databases/performance/performance-dashboard?view=sql-server-ver17)
