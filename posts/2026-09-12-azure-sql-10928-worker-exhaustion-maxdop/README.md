# Diagnose Azure SQL Error 10928 and Worker Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, SQL Server, Performance, Troubleshooting, Monitoring

Description: Diagnose Azure SQL worker exhaustion using utilization, blocking evidence, and query plans, then test concurrency and MAXDOP changes safely.

---

Azure SQL error 10928 can describe a request limit even though the exhausted resource is workers. That wording dates from an older implementation in which queries were single-threaded. Modern parallel queries can consume multiple workers, so counting application requests alone does not explain the ceiling.

The useful question is what keeps workers occupied: too much concurrent work, expensive parallel plans, long blocking chains, or resource saturation that makes every request take longer.

## Capture utilization around the failure

Save the complete error and the affected database or pool configuration. From the user database, examine the incident interval:

```sql
SELECT TOP (120)
    end_time, max_worker_percent, max_session_percent,
    avg_cpu_percent, avg_data_io_percent, avg_log_write_percent
FROM sys.dm_db_resource_stats
ORDER BY end_time DESC;
```

Use a monitoring identity with `VIEW DATABASE STATE`. Preserve these short-lived samples and correlate them with application concurrency and failures. A high worker percentage with moderate session usage is possible: one connection can execute a parallel request requiring many workers.

If the database is pooled, investigate the pool as well. Database-local headroom does not exclude a pool-wide bottleneck. Record the applicable worker limit from the resource-limit table for that configuration, rather than importing an on-premises SQL Server `max worker threads` recommendation.

## Separate blocking from parallelism

Inspect currently visible requests during the problem:

```sql
SELECT
    session_id, status, command, blocking_session_id,
    wait_type, wait_time, total_elapsed_time,
    cpu_time, logical_reads, reads, writes
FROM sys.dm_exec_requests
WHERE session_id <> @@SPID
ORDER BY total_elapsed_time DESC;
```

Visibility depends on the platform and monitoring principal. The general DMV reference documents Azure SQL restrictions, so verify that the diagnostic connection can actually see a known application request. An empty result from a restricted principal is not evidence that no requests exist. Use an appropriately authorized DBA connection and Microsoft's Azure SQL blocking workflow where broader capture is required.

Repeated lock waits with the same blocking session suggest a blocking chain. Determine the head blocker's transaction and application operation before intervention. A sleeping session can still hold an open transaction. Killing it can start a lengthy rollback; that is an incident decision, not a generic tuning step.

For requests with high CPU and parallel execution plans, use Query Store to compare the incident period with a healthy period. Look for increased duration, CPU, logical reads, execution count, and changed plans. A request can occupy more total workers than its MAXDOP value because a parallel plan may contain multiple branches. Do not use `request_count × MAXDOP` as an exact worker measurement.

## Read the actual MAXDOP setting

```sql
SELECT name, value, value_for_secondary
FROM sys.database_scoped_configurations
WHERE name = N'MAXDOP';
```

Microsoft documents a default of 8 for new Azure SQL databases, but older databases and explicit overrides can differ. Query hints, index-operation options, and secondary settings also deserve review. MAXDOP 0 does not mean serial execution; Microsoft recommends avoiding it for Azure SQL Database.

If one reporting query causes the problem, test a lower query-level degree first. The following shape assumes an existing `dbo.OrderLines` table:

```sql
SELECT ProductId, SUM(Quantity) AS total_quantity
FROM dbo.OrderLines
WHERE OrderDate >= '20260901'
GROUP BY ProductId
OPTION (MAXDOP 2);
```

Two is a test value, not a universal recommendation. Compare concurrent throughput, tail latency, worker utilization, and CPU with the original plan. Making an individual query slower can still improve overall service capacity, but it can also hold resources longer and worsen contention.

## Change the database only with a comparison plan

If evidence points to database-wide excessive parallelism, record the previous setting and test a database-scoped change in a representative environment:

```sql
-- Candidate for a controlled concurrency test, not a universal default.
ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 4;
```

This requires suitable administrative privileges or `ALTER ANY DATABASE SCOPED CONFIGURATION`. Restore the recorded previous value if the test regresses performance. Include background maintenance and read-only replicas in the evaluation; a write workload and a reporting workload may need different settings.

Do not immediately force MAXDOP 1 everywhere. A serial plan may consume fewer workers but run much longer. Worker occupancy depends on duration as well as instantaneous parallelism.

## Reduce admitted work and remove the cause

Bound concurrency in queue consumers, background jobs, and HTTP request paths. Stagger large reports and maintenance so they do not all begin at the same minute. Fix missing indexes and expensive scans where execution plans justify the change. Shorten transactions and move unrelated network calls outside them.

For transient failures, bounded retries with jitter can help after capacity returns. Immediate retries from every client increase the same pressure that caused the failure. Track original demand separately from retry attempts so a retry storm does not masquerade as organic traffic growth.

Scaling can provide emergency headroom, but check the actual limit change for the proposed service objective. Preserve the incident evidence before scaling, and verify that the workload stabilizes afterward.

## Conclusion

Error 10928 is a worker-capacity investigation. Combine worker utilization with blocking and query-plan evidence, then test admission limits and scoped parallelism changes against realistic concurrent traffic.

## Official Documentation

- [Worker limits and error 10928](https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-logical-server?view=azuresql)
- [Configure Azure SQL MAXDOP](https://learn.microsoft.com/en-us/azure/azure-sql/database/configure-max-degree-of-parallelism?view=azuresql)
- [Understand and resolve Azure SQL blocking](https://learn.microsoft.com/en-us/azure/azure-sql/database/understand-resolve-blocking?view=azuresql)
- [Database resource statistics](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-resource-stats-azure-sql-database)
- [Request DMV and visibility requirements](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-requests-transact-sql)
- [Monitor performance with Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store)
