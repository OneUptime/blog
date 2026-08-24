# Validation Summary: Monitor SQL Server Query Store Quota Before Read-Only Mode

## Status

validated

## Post Type

Technical monitoring and configuration guide

## Technologies Covered

- Microsoft SQL Server
- SQL Server Query Store
- Transact-SQL
- Always On availability group readable secondary replicas
- Azure SQL Database and Azure SQL Managed Instance Query Store behavior

## Sources Consulted

- [sys.database_query_store_options (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-query-store-options-transact-sql?view=sql-server-ver17)
- [Best practices for managing Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/manage-the-query-store?view=sql-server-ver17)
- [How Query Store collects data](https://learn.microsoft.com/en-us/sql/relational-databases/performance/how-query-store-collects-data?view=sql-server-ver17)
- [Query Store usage scenarios](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-usage-scenarios?view=sql-server-ver17)
- [Query Store for readable secondary replicas](https://learn.microsoft.com/en-us/sql/relational-databases/performance/query-store-for-secondary-replicas?view=sql-server-ver17)
- [ALTER DATABASE SET options: Query Store](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-set-options?view=sql-server-ver17#query-store)
- [decimal and numeric (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/data-types/decimal-and-numeric-transact-sql?view=sql-server-ver17)
- [sys.query_store_runtime_stats_interval (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-interval-transact-sql?view=sql-server-ver17)
- [Query Store stored procedures (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/query-store-stored-procedures-transact-sql?view=sql-server-ver17)

## Issues Found

1. The quota section called `MAX_STORAGE_SIZE_MB` a hard limit. Microsoft documents that the setting is not strictly enforced because Query Store checks its size when writing data to disk and can exceed the configured value before changing state. Renamed the section to refer to the configured limit.
2. The utilization expression cast its result to `decimal(6,2)`, which can represent at most 9,999.99 percent. Because Query Store can overshoot its configured storage size between checks, a sufficiently large overshoot could cause an arithmetic overflow. Widened the result to `decimal(19,2)`.
3. Bit 8 was correctly identified as the secondary-replica bit, but the post did not account for current readable-secondary capture behavior. On supported platforms, `desired_state_desc` and `actual_state_desc` can both be `READ_CAPTURE_SECONDARY` while bit 8 remains set; this is expected and does not mean capture has stopped. Added a state-aware clarification and the relevant Microsoft documentation link.

## Review Notes

- All catalog-view column names, bitmap values, cleanup thresholds, Query Store option names, and T-SQL statements were verified as current and syntactically valid.
- `SIZE_BASED_CLEANUP_MODE = AUTO` starts cleanup at 90 percent of `MAX_STORAGE_SIZE_MB` and stops at approximately 80 percent, as stated.
- For SQL Server 2022 and later, `VIEW DATABASE PERFORMANCE STATE` is the least-privilege permission documented for these views; the broader `VIEW DATABASE STATE` permission also remains sufficient.
- Query Store for readable secondary replicas is available starting with SQL Server 2025 and on documented Azure platforms. Its SQL Server 2022 implementation remains a limited preview and is not supported for production use.
