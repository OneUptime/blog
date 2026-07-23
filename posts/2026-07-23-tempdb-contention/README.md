# SQL Server TempDB Contention: Symptoms, Root Causes, and Configuration Fixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, TempDB, Performance, Latch Contention, Troubleshooting

Description: Distinguish TempDB allocation and metadata latch contention from I/O, capacity, and workload problems, then apply the matching fix.

---

TempDB contention is not one condition. Adding files helps a specific class of allocation-bitmap latch contention, but it does not repair slow storage, an oversized version store, poor memory grants, metadata contention, or a query that spills terabytes.

Begin with wait resources and space consumers. Change file count only when the evidence points to allocation hotspots.

## Confirm That Requests Are Waiting on TempDB

Capture current waits during the slowdown:

```sql
SELECT
    wt.session_id,
    wt.exec_context_id,
    wt.wait_duration_ms,
    wt.wait_type,
    wt.resource_description,
    r.status,
    r.command,
    r.blocking_session_id,
    r.database_id
FROM sys.dm_os_waiting_tasks AS wt
LEFT JOIN sys.dm_exec_requests AS r
  ON r.session_id = wt.session_id
WHERE wt.wait_type LIKE N'PAGE%LATCH_%'
   OR wt.resource_description LIKE N'2:%'
ORDER BY wt.wait_duration_ms DESC;
```

TempDB is database ID 2, and page wait resources commonly appear as `2:<file_id>:<page_id>`. Preserve several samples because individual waits are brief.

Distinguish the families:

- `PAGELATCH_*` is synchronization around an in-memory page. On TempDB allocation map pages, it can indicate concurrent allocation/deallocation contention.
- `PAGEIOLATCH_*` waits for a page to be read from storage. That points toward physical I/O and workload volume, not an in-memory allocation latch.
- `LCK_*` waits are locks and require a transaction/blocking investigation.

Do not call every wait whose name contains “latch” an allocation problem.

## Classify the Hot Page

Allocation contention often concentrates on:

- Page Free Space (PFS) pages;
- Global Allocation Map (GAM) pages;
- Shared Global Allocation Map (SGAM) pages.

Common examples include page 1 (PFS) and page 3 (SGAM) in one or more TempDB data files, but use documented page information and repeated evidence rather than memorizing two addresses. On supported versions, inspect a wait resource with `sys.dm_db_page_info`:

```sql
SELECT
    page_type,
    page_type_desc,
    object_id,
    index_id
FROM sys.dm_db_page_info
(
    DB_ID(N'tempdb'),
    1,      -- file_id from the wait resource
    1,      -- page_id from the wait resource
    'DETAILED'
);
```

If many sessions contend on PFS/GAM/SGAM pages across a TempDB-heavy workload, file layout and allocation behavior are relevant. If they contend on TempDB system catalog pages while repeatedly creating and dropping temporary objects, investigate metadata contention instead.

## Measure What Consumes TempDB

Summarize allocation categories:

```sql
USE tempdb;
GO

SELECT
    SUM(unallocated_extent_page_count) * 8.0 / 1024 AS free_mb,
    SUM(version_store_reserved_page_count) * 8.0 / 1024 AS version_store_mb,
    SUM(user_object_reserved_page_count) * 8.0 / 1024 AS user_objects_mb,
    SUM(internal_object_reserved_page_count) * 8.0 / 1024 AS internal_objects_mb,
    SUM(mixed_extent_page_count) * 8.0 / 1024 AS mixed_extents_mb
FROM sys.dm_db_file_space_usage;
```

Find sessions with accumulated net allocations from completed tasks:

```sql
SELECT TOP (20)
    session_id,
    (user_objects_alloc_page_count - user_objects_dealloc_page_count)
        * 8.0 / 1024 AS net_user_object_mb,
    (internal_objects_alloc_page_count - internal_objects_dealloc_page_count)
        * 8.0 / 1024 AS net_internal_object_mb
FROM sys.dm_db_session_space_usage
WHERE session_id > 50
ORDER BY net_internal_object_mb DESC, net_user_object_mb DESC;
```

These counters are updated when a task ends and do not describe allocations in a currently running task. A large version store can also be retained by transaction behavior not obvious from the top session allocator. Correlate task-level space use, Query Store plans, spills, isolation settings, and long transactions.

## Inspect File Count, Size, Growth, and Placement

```sql
USE tempdb;
GO

SELECT
    file_id,
    name,
    type_desc,
    size * 8.0 / 1024 AS size_mb,
    is_percent_growth,
    CASE WHEN is_percent_growth = 1
         THEN growth
         ELSE growth * 8.0 / 1024
    END AS growth_value,
    physical_name
FROM sys.database_files
ORDER BY type, file_id;
```

For SQL Server 2016 and later, Microsoft's starting point is one equally sized TempDB data file per logical processor up to eight. If allocation contention persists, add data files in groups of four, keeping them equally sized, up to the number of logical processors. This is a test-driven progression, not a rule to create one file per core on a 128-core server immediately.

Pre-size files for the measured workload and use equal fixed-megabyte growth increments. Unequal files receive unequal proportional-fill traffic and can recreate hotspots. Keep one TempDB log file unless a specific capacity incident requires another; multiple log files do not stripe normal log writes.

Example only, after validating paths and capacity:

```sql
ALTER DATABASE tempdb MODIFY FILE
    (NAME = N'tempdev', SIZE = 8192MB, FILEGROWTH = 512MB);

ALTER DATABASE tempdb ADD FILE
(
    NAME = N'tempdev2',
    FILENAME = N'T:\TempDB\tempdb2.ndf',
    SIZE = 8192MB,
    FILEGROWTH = 512MB
);
```

Repeat with unique logical and physical names for the approved file count. SQL Server recreates TempDB at startup, so test a controlled restart and confirm every path and service-account permission.

SQL Server 2016 made uniform extent allocation and coordinated TempDB data-file autogrowth default behavior that previously required trace flags 1118 and 1117. Do not copy legacy trace-flag advice onto a modern instance without version-specific justification. Keep SQL Server on an approved current cumulative update because allocation improvements have shipped through servicing and later releases.

## Treat Metadata Contention Separately

High-concurrency creation and deletion of temporary tables can contend on TempDB system metadata. Adding files may not remove that bottleneck. Reduce unnecessary create/drop cycles and use stored-procedure patterns that permit temporary object caching where appropriate.

SQL Server 2019 introduced memory-optimized TempDB metadata for on-premises SQL Server. Enable it only when diagnostic evidence shows metadata contention that materially limits the workload:

```sql
ALTER SERVER CONFIGURATION
SET MEMORY_OPTIMIZED TEMPDB_METADATA = ON;
```

The change requires a service restart. It changes TempDB system-table implementation, consumes memory, has documented limitations, and is not available on every Azure SQL platform. Test memory behavior, workload compatibility, startup, and rollback before production. It does not fix allocation latches or slow TempDB storage.

## Fix the Workload That Drives TempDB

TempDB stores temporary tables and table variables, sort/hash worktables, row versions, cursor worktables, and other internal objects. Configuration provides capacity and concurrency; query and transaction design controls demand.

Investigate:

- repeated large sorts or hash spills caused by bad estimates or insufficient memory grants;
- non-searchable predicates and missing/ineffective indexes that process excess rows;
- unnecessary columns and rows materialized into temporary objects;
- loops that create and drop temporary tables at very high frequency;
- long transactions retaining row versions under read-committed snapshot or snapshot isolation;
- online index and maintenance operations using TempDB;
- unbounded reports or ETL sharing the OLTP instance.

An index or query rewrite that eliminates a spill can outperform any storage change. Conversely, moving TempDB to fast, supported storage can help genuine I/O waits but will not reduce the bytes a bad plan writes.

## Validate One Change at a Time

Replay representative concurrency and compare:

- application latency and throughput;
- wait deltas and exact page resources;
- TempDB allocation category and peak size;
- file-level read/write latency and growth events;
- spills, memory grants, and version-store retention;
- CPU, memory, and restart behavior.

Keep enough free disk for peaks and growth, but alert well before capacity is exhausted. On SQL Server 2025, Resource Governor can limit TempDB space by workload group; that is a guardrail for supported designs, not a replacement for sizing and tuning.

The fix is complete when the proven bottleneck moves or disappears under realistic load—not when an arbitrary file-count checklist is satisfied.

## Official Documentation

- [TempDB database](https://learn.microsoft.com/en-us/sql/relational-databases/databases/tempdb-database?view=sql-server-ver17)
- [Recommendations to reduce TempDB allocation contention](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/recommendations-reduce-allocation-contention)
- [sys.dm_db_file_space_usage](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-file-space-usage-transact-sql?view=sql-server-ver17)
- [In-memory database features, including memory-optimized TempDB metadata](https://learn.microsoft.com/en-us/sql/relational-databases/in-memory-database?view=sql-server-ver17)
- [TempDB space resource governance](https://learn.microsoft.com/en-us/sql/relational-databases/resource-governor/tempdb-space-resource-governance?view=sql-server-ver17)
