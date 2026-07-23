# Validation Summary: Why a SQL Server Query Is Fast in SSMS but Slow in the Application

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft SQL Server
- SQL Server Management Studio (SSMS)
- Transact-SQL
- SQL Server Extended Events
- SQL Server Query Store
- SQL Server execution plans and plan cache
- Parameter Sensitive Plan optimization
- Always On availability group read-only routing

## Sources Consulted
- Microsoft Learn: Troubleshoot query performance differences between a database application and SSMS — https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/troubleshoot-application-slow-ssms-fast
- Microsoft Learn: `CREATE EVENT SESSION` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/statements/create-event-session-transact-sql?view=sql-server-ver17
- Microsoft Learn: Extended Events targets — https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/targets-for-extended-events-in-sql-server?view=sql-server-ver17
- Microsoft Learn: `DBCC USEROPTIONS` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-useroptions-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sys.dm_exec_plan_attributes` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-plan-attributes-transact-sql?view=sql-server-ver17
- Microsoft Learn: Display an actual execution plan — https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-an-actual-execution-plan?view=sql-server-ver17
- Microsoft Learn: Display the estimated execution plan — https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-the-estimated-execution-plan?view=sql-server-ver17
- Microsoft Learn: Monitor performance by using Query Store — https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17
- Microsoft Learn: `sys.query_store_runtime_stats` (Transact-SQL) — https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-query-store-runtime-stats-transact-sql?view=sql-server-ver17
- Microsoft Learn: Parameter Sensitive Plan optimization — https://learn.microsoft.com/en-us/sql/relational-databases/performance/parameter-sensitive-plan-optimization?view=sql-server-ver17
- Microsoft Learn: Query hints, including `RECOMPILE` — https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-query?view=sql-server-ver17
- Microsoft Learn: Data type precedence (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/data-types/data-type-precedence-transact-sql?view=sql-server-ver17
- Microsoft Learn: Troubleshoot `ASYNC_NETWORK_IO` waits — https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/troubleshoot-query-async-network-io
- Microsoft Learn: Table hints, including `NOLOCK` / `READUNCOMMITTED` — https://learn.microsoft.com/en-us/sql/t-sql/queries/hints-transact-sql-table?view=sql-server-ver17
- Microsoft Learn: Connect to an availability group listener and use read-only routing — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/listeners-client-connectivity-application-failover?view=sql-server-ver17

## Issues Found
- The execution-plan explanation said an actual plan includes warnings without qualifying that warnings appear only when they occur. Changed this to “any runtime warnings,” matching Microsoft’s actual-plan documentation.
- The Query Store guidance recommended grouping by “application context,” but Query Store runtime statistics do not record the client application name. Changed the dimensions to the documented `plan_id`, execution type, and runtime-statistics interval.
- The SQL Server 2022 Parameter Sensitive Plan recommendation was broader than the feature’s documented scope. Qualified it as applying to an eligible parameterized `SELECT` at compatibility level 160.

## Review Notes
- The Extended Events session, `DBCC USEROPTIONS`, cached-plan attribute query, and stored-procedure invocation are syntactically valid for SQL Server. The example `D:\XEvents` directory is server-specific and must exist with suitable write access in the deployment environment.
- On SQL Server 2022 and later, the dynamic management functions used by the cached-plan query require `VIEW SERVER PERFORMANCE STATE`; earlier supported versions require `VIEW SERVER STATE`. The post’s generic permission warning is accurate.
- SQL Server 2022 PSP optimization is limited to eligible parameterized queries and equality predicates. The revised “eligible parameterized `SELECT`” wording avoids promising PSP behavior for unsupported statement shapes.
