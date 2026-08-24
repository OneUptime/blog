# How to Monitor SQL Server Query Store Quota Before It Silently Switches to Read-Only

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Query Store, Storage Quota, Database Monitoring, Performance Tuning

Description: Monitor Query Store state, quota utilization, cleanup policy, and read-only reason bits so loss of new performance history is detected before an incident.

---

SQL Server Query Store lives inside the user database and has a configured storage limit. When it reaches that limit, Query Store can change from read-write to read-only and stop collecting new query data while historical reports continue to look normal.

Monitor desired and actual state, not only whether old rows are queryable.

## Export the authoritative options

Run this in every database where Query Store should collect data:

```sql
SELECT actual_state_desc,
       desired_state_desc,
       current_storage_size_mb,
       max_storage_size_mb,
       CAST(100.0 * current_storage_size_mb
            / NULLIF(max_storage_size_mb, 0) AS decimal(19,2))
         AS quota_used_percent,
       readonly_reason,
       size_based_cleanup_mode_desc,
       stale_query_threshold_days,
       query_capture_mode_desc,
       flush_interval_seconds,
       interval_length_minutes
FROM sys.database_query_store_options;
```

`desired_state_desc = 'READ_WRITE'` does not prove capture is happening. The critical mismatch is a desired read-write state with an actual read-only or error state. Export the raw `readonly_reason` integer because it is a bitmap and multiple causes can be present.

Common bits include:

| Bit | Meaning |
|---:|---|
| 1 | Database itself is read-only |
| 2 | Database is in single-user mode |
| 4 | Database is in emergency mode |
| 8 | Database is a secondary replica |
| 65,536 | Query Store reached `MAX_STORAGE_SIZE_MB` |
| 131,072 | Distinct statements reached an internal memory limit |
| 262,144 | In-memory items waiting for persistence reached a limit |
| 524,288 | The database reached its disk-size limit |

Interpret bit 8 together with the state columns. When Query Store capture on readable secondary replicas is enabled on a supported platform, both states are `READ_CAPTURE_SECONDARY` and bit 8 remains set; that is an expected capture state, not a failure.

Test a bit with bitwise AND rather than equality:

```sql
SELECT CASE WHEN (readonly_reason & 65536) = 65536
            THEN 1 ELSE 0 END AS quota_readonly,
       CASE WHEN (readonly_reason & 524288) = 524288
            THEN 1 ELSE 0 END AS database_space_readonly
FROM sys.database_query_store_options;
```

Bit 262,144 can be temporary while pending items flush. It still deserves monitoring, especially if it persists or recurs under load.

## Alert before the configured limit

Use two complementary alerts:

- quota utilization is above a planned warning threshold and continues to grow;
- actual state differs from the intended state, immediately annotated with decoded reason bits.

Require less headroom when growth is slow and cleanup is effective; require more for ad hoc or bursty workloads. Estimate time to limit from a robust multi-hour or multi-day storage-growth slope, but suppress that forecast after cleanup because the gauge can decrease.

Also alert if no recent runtime interval or query capture activity appears despite real database traffic. This catches permission or collector problems and capture-policy exclusions that the quota gauge cannot.

## Configure cleanup and capture together

With `SIZE_BASED_CLEANUP_MODE = AUTO`, Query Store activates size-based cleanup near 90 percent of its maximum and continues until it is around 80 percent. Cleanup can remove older or less useful history, so it is a protective mechanism rather than infinite retention.

An illustrative database-level configuration is:

```sql
ALTER DATABASE [Orders]
SET QUERY_STORE = ON (
  OPERATION_MODE = READ_WRITE,
  MAX_STORAGE_SIZE_MB = 2048,
  SIZE_BASED_CLEANUP_MODE = AUTO,
  CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30),
  QUERY_CAPTURE_MODE = AUTO
);
```

Choose the size from measured statement diversity, capture mode, runtime-statistics interval, retention goal, database growth limits, backup cost, and failover topology. Defaults differ by SQL Server version and Azure service tier; inventory the live view instead of hard-coding an assumed default.

`QUERY_CAPTURE_MODE = AUTO` or a tested custom capture policy can reduce ad hoc noise. It can also exclude a rare statement needed during an incident. Monitor capture-policy behavior and document that tradeoff.

## Recover without destroying evidence

When Query Store becomes read-only:

1. capture `sys.database_query_store_options`, database free space, recent growth, and capture settings;
2. decode every reason bit;
3. fix the applicable cause—database space, quota, memory pressure, or capture churn;
4. remove only confirmed obsolete Query Store data or raise a justified quota;
5. request read-write operation and verify the actual state and new capture.

For example, after creating safe headroom:

```sql
ALTER DATABASE [Orders]
SET QUERY_STORE (OPERATION_MODE = READ_WRITE);
```

Do not reflexively run `ALTER DATABASE ... SET QUERY_STORE CLEAR ALL`. Clearing is destructive and removes the baseline needed to diagnose the event. Microsoft provides Query Store stored procedures for targeted query, plan, or runtime-statistics maintenance; rehearse them on a copy and preserve required evidence.

Query Store catalog views require database-level performance visibility. SQL Server 2022 and later use `VIEW DATABASE PERFORMANCE STATE` for these views; earlier supported versions use `VIEW DATABASE STATE`. Grant the monitoring identity only the capability required for the deployed version.

## Official Documentation

- [SQL Server `sys.database_query_store_options`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql?view=sql-server-ver17)
- [Best practices for managing Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/manage-the-query-store?view=sql-server-ver17)
- [SQL Server Query Store usage scenarios](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-usage-scenarios?view=sql-server-ver17)
- [Query Store for readable secondary replicas](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-for-secondary-replicas?view=sql-server-ver17)
- [`ALTER DATABASE SET` Query Store options](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-set-options?view=sql-server-ver17#query-store)
- [Query Store stored procedures](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/query-store-stored-procedures-transact-sql?view=sql-server-ver17)

## Conclusion

Export Query Store's desired state, actual state, size, maximum size, cleanup policy, and raw read-only bitmap from every database. Alert on growth before the quota and immediately on a state mismatch, then create headroom and restore capture without clearing the performance history responders need.
