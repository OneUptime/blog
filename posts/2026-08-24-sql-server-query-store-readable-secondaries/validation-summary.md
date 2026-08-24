# Validation Summary: Monitor Read-Only SQL Server Workloads with Query Store

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- SQL Server 2022 (16.x) and SQL Server 2025 (17.x)
- SQL Server Query Store
- Always On availability groups and readable secondary replicas
- Azure SQL Database and Azure SQL Managed Instance
- Transact-SQL catalog views and Query Store runtime statistics
- SQL Server Management Studio (SSMS)
- HADR transport and availability-group monitoring

## Sources Consulted

- [Query Store for readable secondary replicas](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-for-secondary-replicas?view=sql-server-ver17)
- [SQL Server 2022 release notes](https://learn.microsoft.com/en-us/sql/sql-server/sql-server-2022-release-notes?view=sql-server-ver17)
- [`ALTER DATABASE SET` options: `FOR SECONDARY`](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-set-options?view=sql-server-ver17#for-secondary)
- [`sys.database_query_store_options`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql?view=sql-server-ver17)
- [`sys.database_query_store_internal_state`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-internal-state-transact-sql?view=sql-server-ver17)
- [`sys.query_store_runtime_stats`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17)
- [`sys.query_store_runtime_stats_interval`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-interval-transact-sql?view=sql-server-ver17)
- [`sys.query_store_replicas`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-replicas?view=sql-server-ver17)
- [`sys.query_store_query`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-query-transact-sql?view=sql-server-ver17)
- [`sys.query_store_plan`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-plan-transact-sql?view=sql-server-ver17)
- [`sys.query_store_query_text`](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-query-text-transact-sql?view=sql-server-ver17)
- [`SYSUTCDATETIME`](https://learn.microsoft.com/en-us/sql/t-sql/functions/sysutcdatetime-transact-sql?view=sql-server-ver17)
- [Tools to monitor Always On availability groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/monitoring-of-availability-groups-sql-server?view=sql-server-ver17)
- [Monitor performance for Always On availability groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/monitor-performance-for-always-on-availability-groups?view=sql-server-ver17)
- [Best practices for monitoring workloads with Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/best-practice-with-the-query-store?view=sql-server-ver17)

## Issues Found

- The disablement instructions omitted Microsoft's documented connection context. They now direct the reader to connect to the `master` database on the primary before running `ALTER DATABASE ... FOR SECONDARY ... OPERATION_MODE = READ_ONLY`.
- The SSMS IntelliSense caveat only covered versions before SSMS 21. Microsoft separately documents that IntelliSense does not recognize `FOR SECONDARY` for SQL Server 2022, so that version-specific caveat was added.
- The post described `sys.database_query_store_internal_state` as generally available transport-health telemetry. Its reference page documents it for SQL Server 2025 and Azure SQL Database, and it exposes Query Store messaging queue length and memory rather than direct HADR transport health. The text now states the documented platform scope and metric meaning, including what `pending_message_count` represents.
- The HADR correlation guidance referred imprecisely to send/receive queues. It now uses the documented log-send and redo queues plus send/receive throughput.
- The scope of `sys.query_store_replicas` was described as all supported Azure SQL platforms. Its current reference page lists SQL Server 2025 and Azure SQL Database, so the statement was narrowed to those platforms.
- The blanket permission claim for Query Store catalog views was incorrect. The post now distinguishes the common `VIEW DATABASE PERFORMANCE STATE` requirement from the `VIEW DATABASE STATE` requirement for `sys.database_query_store_internal_state` and the server-level `VIEW SERVER PERFORMANCE STATE` requirement for `sys.query_store_query_text` on SQL Server 2022 and later.

## Review Notes

- Query Store for readable secondary replicas remains a preview feature across SQL Database Engine platforms. SQL Server 2022 remains a limited preview that is unsupported in production and requires trace flag 12606 on the primary and every readable secondary; SQL Server 2025 supports per-database enablement but remains in preview.
- The enable and disable T-SQL statements are syntactically correct and match Microsoft's current examples. The expected secondary state of `READ_CAPTURE_SECONDARY` with `readonly_reason = 8` is also correct.
- The runtime-statistics query uses valid columns and joins. `execution_type = 0` selects successful regular executions, CPU and duration are correctly converted from microseconds to milliseconds, and both averages are correctly weighted by execution count.
- The eight-hour filter is based on Query Store interval start times, so it is interval-aligned rather than an exact per-execution time window.
- Microsoft's readable-secondary article uses the post's `replica_group_id` labels, while the `sys.query_store_replicas` reference uses different labels for the separate `role_type` field. The post correctly retains the documented `replica_group_id` mapping and does not treat the two fields as the same enum.
- All five links in the post's Official Documentation section resolve to the intended Microsoft Learn pages.
