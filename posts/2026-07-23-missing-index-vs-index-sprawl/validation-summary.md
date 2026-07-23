# Validation Summary: Missing Index or Index Sprawl? A Safer SQL Server Tuning Workflow

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (T-SQL)
- SQL Server Query Store
- SQL Server missing-index dynamic management views
- SQL Server index catalog views and usage statistics
- Nonclustered, included-column, filtered, unique, online, and resumable indexes

## Sources Consulted

- [Tune nonclustered indexes with missing-index suggestions](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/tune-nonclustered-missing-index-suggestions?view=sql-server-ver17)
- [sys.dm_db_missing_index_group_stats (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-missing-index-group-stats-transact-sql?view=sql-server-ver17)
- [sys.dm_db_missing_index_details (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-missing-index-details-transact-sql?view=sql-server-ver17)
- [sys.dm_db_index_usage_stats (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-index-usage-stats-transact-sql?view=sql-server-ver17)
- [sys.index_columns (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-index-columns-transact-sql?view=sql-server-ver17)
- [Index architecture and design guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17)
- [Clustered and nonclustered indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/clustered-and-nonclustered-indexes-described?view=sql-server-ver17)
- [Create indexes with included columns](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/create-indexes-with-included-columns?view=sql-server-ver17)
- [Monitor performance by using the Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17)
- [SET STATISTICS IO (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-io-transact-sql?view=sql-server-ver17)
- [SET STATISTICS TIME (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-time-transact-sql?view=sql-server-ver17)
- [CREATE INDEX (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-index-transact-sql?view=sql-server-ver17)
- [Guidelines for online index operations](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/guidelines-for-online-index-operations?view=sql-server-ver17)
- [Disable indexes and constraints](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/disable-indexes-and-constraints?view=sql-server-ver17)
- [Query processing architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/query-processing-architecture-guide?view=sql-server-ver17)

## Issues Found

- The introduction said that additional indexes could leave the plan cache full of optimizer alternatives. SQL Server's plan cache stores compiled plans, not the alternative access paths considered during optimization. Changed the wording to state that extra indexes give the optimizer more access paths to evaluate during compilation.
- The workload-testing guidance used `SET STATISTICS IO, TIME` as shorthand. That is not valid executable T-SQL because `IO` and `TIME` are separate `SET STATISTICS` options. Replaced it with `SET STATISTICS IO ON` and `SET STATISTICS TIME ON`.
- The usage-statistics discussion did not distinguish index-maintenance operations from affected rows. Added that `user_updates` counts operations, not the number of rows changed, so the counter is not misread as row-level write volume.
- The deployment guidance broadly suggested disabling an overlapping old index. Disabling a clustered index makes the table data inaccessible, and disabling a unique or constraint-supporting index can remove enforcement. Restricted staged disabling to nonclustered, nonunique indexes that do not enforce constraints.

## Review Notes

- The DMV examples require state-inspection permissions. On SQL Server 2022 and later, the relevant missing-index and index-usage DMVs require `VIEW SERVER PERFORMANCE STATE`; earlier supported SQL Server versions use `VIEW SERVER STATE`.
- Query Store is available in SQL Server 2016 and later. It is enabled in `READ_WRITE` mode by default for new databases starting with SQL Server 2022, but capture mode, retention settings, and a read-only or error state can affect the evidence retained.
- The missing-index prioritization formula is an estimate, and the division by 100 only rescales the score; it does not change the ordering.
