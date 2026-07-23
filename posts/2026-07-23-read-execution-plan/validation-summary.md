# Validation Summary: How to Read a SQL Server Execution Plan and Find the Actual Bottleneck

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- Transact-SQL
- SQL Server execution plans and Showplan XML
- SQL Server Query Optimizer and cardinality estimation
- Query Store
- `SET STATISTICS XML`, `SET STATISTICS IO`, and `SET STATISTICS TIME`

## Sources Consulted

- [Execution plan overview](https://learn.microsoft.com/en-us/sql/relational-databases/performance/execution-plans?view=sql-server-ver17)
- [Display and save execution plans](https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-and-save-execution-plans?view=sql-server-ver17)
- [Analyze an actual execution plan](https://learn.microsoft.com/en-us/sql/relational-databases/performance/analyze-an-actual-execution-plan?view=sql-server-ver17)
- [Logical and physical Showplan operator reference](https://learn.microsoft.com/en-us/sql/relational-databases/showplan-logical-and-physical-operators-reference?view=sql-server-ver17)
- [`SET STATISTICS XML` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-xml-transact-sql?view=sql-server-ver17)
- [`SET STATISTICS IO` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-io-transact-sql?view=sql-server-ver17)
- [`SET STATISTICS TIME` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-statistics-time-transact-sql?view=sql-server-ver17)
- [Tune performance with the Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/tune-performance-with-the-query-store?view=sql-server-ver17)
- [`sys.dm_exec_plan_attributes` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-plan-attributes-transact-sql?view=sql-server-ver17)
- [Troubleshoot slow performance or low memory issues caused by memory grants](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/troubleshoot-memory-grant-issues)
- [Data type precedence (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-type-precedence-transact-sql?view=sql-server-ver17)
- [Cardinality Estimation (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/performance/cardinality-estimation-sql-server?view=sql-server-ver17)

## Issues Found

- Query Store was said to provide runtime “distributions.” Changed this to “aggregated runtime statistics” because Query Store persists runtime metrics aggregated by plan and time interval rather than every individual execution measurement.
- The Sorts and Spools section could be read as saying that a spool spills. Clarified that a spool materializes rows in a hidden `tempdb` worktable and that spill warnings apply to the Sort operator in this context.
- The implicit-conversion warning described the data types as incompatible. Changed this to “differing data types” because SQL Server performs an implicit conversion only when that conversion is supported; an unsupported implicit conversion returns an error.
- The cost-percentage explanation identified the displayed percentages as estimated subtree-cost comparisons. Changed it to the accurate, tool-independent statement that graphical percentages are derived from optimizer cost estimates within the compiled plan.

## Review Notes

- Both T-SQL examples are syntactically valid for SSMS and use current, supported `SET STATISTICS` options.
- The post correctly distinguishes estimated plans from actual plans, describes right-to-left graphical flow and pull-based runtime execution, and treats warnings and estimated costs as diagnostic leads rather than measured bottlenecks.
- Query Store is available in SQL Server 2016 (13.x) and later. The exact runtime properties visible in an actual plan vary by SQL Server and SSMS version.
