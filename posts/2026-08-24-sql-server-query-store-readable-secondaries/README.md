# How to Monitor Read-Only Workloads on SQL Server Availability Group Secondaries with Query Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Query Store, Availability Groups, Readable Secondaries, High Availability

Description: Enable and validate Query Store capture for readable-secondary workloads, segment statistics by replica role, and respect the feature's current preview and version limits.

---

Traditional Query Store capture on the primary does not describe queries executed only on a readable availability-group secondary. Query Store for readable secondary replicas fills that gap by streaming secondary runtime, wait, query, and plan information to the primary, where it is persisted and made visible to the replica set.

As of the current Microsoft documentation, the feature is in preview on all SQL Database Engine platforms. Its availability and production support differ sharply by platform and version.

## Check support before changing anything

The current matrix includes:

- SQL Server 2025 (17.x): available, disabled by default per database, still preview;
- SQL Server 2022 (16.x): limited preview, disabled by default, and not supported for production;
- Azure SQL Database and qualifying Azure SQL Managed Instance update policies: platform-specific availability and defaults;
- Azure SQL Database Hyperscale: currently not supported for this feature.

On SQL Server 2022 only, trace flag 12606 must be enabled on the primary and every readable secondary to expose the limited preview. Microsoft explicitly says the flag is not intended for production deployments on SQL Server 2022. Do not use it to bypass that support boundary.

Inventory engine version, edition, service tier, update policy, availability-group topology, readable routing, Query Store state, and preview acceptance before rollout.

## Enable from the primary

If the primary database is not already capturing in read-write mode, connect to the primary and run:

```sql
ALTER DATABASE [Orders]
SET QUERY_STORE = ON (OPERATION_MODE = READ_WRITE);
```

Then, still connected to the primary, enlist readable secondaries:

```sql
ALTER DATABASE [Orders]
FOR SECONDARY
SET QUERY_STORE = ON (OPERATION_MODE = READ_WRITE);
```

The `FOR SECONDARY` syntax can be valid even when SSMS IntelliSense marks it as an error. Microsoft notes that SSMS versions before 21 do not recognize it correctly and that IntelliSense does not recognize it for SQL Server 2022. Server execution and the subsequent state check are authoritative.

To disable secondary capture without turning off the primary's Query Store, connect to the `master` database on the primary and run:

```sql
ALTER DATABASE [Orders]
FOR SECONDARY
SET QUERY_STORE = ON (OPERATION_MODE = READ_ONLY);
```

Use a tested change plan and validate every replica after enablement, failover, patching, and topology change.

## Validate on a readable secondary

Connect to the database through a readable secondary and query:

```sql
SELECT desired_state_desc,
       actual_state_desc,
       readonly_reason
FROM sys.database_query_store_options;
```

The documented healthy capture result on a secondary is:

```text
desired_state_desc = READ_CAPTURE_SECONDARY
actual_state_desc  = READ_CAPTURE_SECONDARY
readonly_reason    = 8
```

Reason 8 means the database is a secondary replica; in this state it is expected, not a Query Store quota failure. Alert on deviation from this exact intended state, stale secondary intervals despite routed traffic, or growing internal messaging backlog.

On SQL Server 2025 (17.x) and supported Azure SQL Database configurations, current builds expose Query Store messaging queue length and memory usage through:

```sql
SELECT pending_message_count,
       messaging_memory_used_mb
FROM sys.database_query_store_internal_state;
```

`pending_message_count` is the number of messages waiting on the primary for the replica from whose perspective the view is queried. Baseline these values and correlate persistent growth with HADR transport health, log-send and redo queues, send/receive throughput, network latency, and Query Store persistence on the primary.

## Segment every workload by replica role

`sys.query_store_runtime_stats.replica_group_id` identifies the role that originated the data. Never aggregate it away when comparing a primary and secondary:

```sql
DECLARE @hours int = 8;

SELECT q.query_id,
       p.plan_id,
       rs.replica_group_id,
       CASE rs.replica_group_id
         WHEN 1 THEN 'PRIMARY'
         WHEN 2 THEN 'SECONDARY'
         WHEN 3 THEN 'GEO SECONDARY'
         WHEN 4 THEN 'GEO HA SECONDARY'
         ELSE CONCAT('NAMED REPLICA_', rs.replica_group_id)
       END AS replica_role,
       SUM(rs.count_executions) AS executions,
       SUM(CONVERT(float, rs.avg_cpu_time) * rs.count_executions)
         / NULLIF(SUM(rs.count_executions), 0) / 1000.0 AS avg_cpu_ms,
       SUM(CONVERT(float, rs.avg_duration) * rs.count_executions)
         / NULLIF(SUM(rs.count_executions), 0) / 1000.0 AS avg_duration_ms
FROM sys.query_store_runtime_stats_interval AS i
JOIN sys.query_store_runtime_stats AS rs
  ON rs.runtime_stats_interval_id = i.runtime_stats_interval_id
JOIN sys.query_store_plan AS p
  ON p.plan_id = rs.plan_id
JOIN sys.query_store_query AS q
  ON q.query_id = p.query_id
WHERE i.start_time >= DATEADD(hour, -@hours, SYSUTCDATETIME())
  AND rs.execution_type = 0
GROUP BY q.query_id,
         p.plan_id,
         rs.replica_group_id
ORDER BY avg_cpu_ms DESC;
```

The execution-weighted averages are important. Also aggregate duplicate rows for the active interval by plan, execution type, interval, and replica group before using that interval in an alert.

On SQL Server 2025 (17.x) and Azure SQL Database, `sys.query_store_replicas` maps `replica_group_id` to `role_type` and `replica_name`. The view records roles observed over time; after failover it can have rows for the same replica in multiple roles. In SQL Server, `replica_name` can be `NULL`, so retain role IDs and topology metadata from the availability group.

## Account for failover and transport cost

Secondary Query Store data uses the existing HADR transport rather than a separate endpoint. Query text, plans, and runtime/wait statistics are multiplexed with high-availability traffic, persisted on the primary, and add to the same Query Store storage budget.

Monitor:

- Query Store quota and cleanup on the primary;
- capture and receive queue metrics;
- HADR transport latency and backlog;
- negative temporary query or plan IDs awaiting authoritative persistence;
- missing intervals by replica role;
- read-only routing and actual request distribution.

Negative query or plan IDs on a secondary are temporary in-memory placeholders. They become positive after the primary persists an eligible captured query. A custom capture policy can delay or exclude that transition.

Role aggregation means two local secondaries serving the same secondary role can be combined rather than distinguished as individual hosts. Keep separate infrastructure and routing telemetry when per-node diagnosis is required.

Most Query Store views used here require `VIEW DATABASE PERFORMANCE STATE` on SQL Server 2022 and later. `sys.database_query_store_internal_state` instead requires `VIEW DATABASE STATE`, while `sys.query_store_query_text` requires `VIEW SERVER PERFORMANCE STATE` on SQL Server 2022 and later. Query text and plans are sensitive, so use least privilege and do not make them metric labels.

## Official Documentation

- [Query Store for readable secondary replicas](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-for-secondary-replicas?view=sql-server-ver17)
- [SQL Server `sys.database_query_store_options`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql?view=sql-server-ver17)
- [SQL Server `sys.query_store_runtime_stats`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17)
- [SQL Server `sys.query_store_replicas`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-replicas?view=sql-server-ver17)
- [Always On availability group monitoring](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/monitoring-of-availability-groups-sql-server?view=sql-server-ver17)

## Conclusion

Use Query Store for readable secondaries only on a documented supported platform with preview risk accepted. Enable it from the primary, require `READ_CAPTURE_SECONDARY` with reason 8 on each readable secondary, segment runtime statistics by `replica_group_id`, and monitor both the primary's Query Store budget and the shared HADR transport carrying the capture data.
