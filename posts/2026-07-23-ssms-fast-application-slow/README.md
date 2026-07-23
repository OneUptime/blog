# Why a SQL Server Query Is Fast in SSMS but Slow in the Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Query Performance, SSMS, Extended Events, Query Store

Description: Diagnose application-only SQL Server slowness by comparing the submitted request, connection settings, server execution, and client processing.

---

Executing text that looks similar in SQL Server Management Studio does not prove that SSMS and the application ran the same request under the same conditions. Different parameter values, parameter metadata, connection `SET` options, transactions, databases, plans, networks, and result-consumption behavior can all create a real performance difference.

The fastest route to the cause is to compare evidence from the same time window, not to clear the plan cache or add `ARITHABORT ON` and hope.

## Define Which Time Is Slow

Separate the end-to-end request into:

```text
connection acquisition
application queueing
network request
SQL Server execution
network response
client row consumption and mapping
```

Capture application timing around connection open, command execution, and full result enumeration. At the same time, capture SQL Server duration, CPU, logical reads, writes, row count, and wait information. If SQL Server finishes in 100 ms but the application completes in 8 seconds, an execution-plan fix is unlikely to solve client-side processing, connection-pool waits, or a slow consumer indicated by `ASYNC_NETWORK_IO`.

## Capture What the Application Actually Sends

Do not reconstruct the query from an ORM log if the database can show the actual RPC or batch. Use a narrowly filtered Extended Events session in a test or carefully controlled production window:

```sql
CREATE EVENT SESSION [AppQueryCompare] ON SERVER
ADD EVENT sqlserver.rpc_completed
(
    ACTION
    (
        sqlserver.client_app_name,
        sqlserver.client_hostname,
        sqlserver.database_name,
        sqlserver.session_id,
        sqlserver.sql_text,
        sqlserver.username
    )
    WHERE (sqlserver.database_name = N'Sales')
),
ADD EVENT sqlserver.sql_batch_completed
(
    ACTION
    (
        sqlserver.client_app_name,
        sqlserver.client_hostname,
        sqlserver.database_name,
        sqlserver.session_id,
        sqlserver.sql_text,
        sqlserver.username
    )
    WHERE (sqlserver.database_name = N'Sales')
)
ADD TARGET package0.event_file
(
    SET filename = N'D:\XEvents\AppQueryCompare.xel',
        max_file_size = 100,
        max_rollover_files = 4
);

ALTER EVENT SESSION [AppQueryCompare] ON SERVER STATE = START;
```

Use tighter application, login, or query filters where possible, and protect event files because statement text can contain sensitive values. Capture an application execution and an SSMS execution close together. Then compare:

- exact database and schema resolution;
- RPC versus ad hoc batch form;
- parameter values and whether they represent common or skewed data;
- parameter SQL types, lengths, precision, and scale;
- row count and result shape;
- transaction state and isolation level.

An `nvarchar(4000)` parameter sent against a `varchar(30)` column, for example, is materially different from a correctly typed parameter and can introduce conversion behavior. Test with the application's real parameter declaration, not only the displayed literal.

## Match Connection SET Options

Some connection options affect plan selection and are part of the plan-cache identity. Run this on the application connection and the SSMS connection:

```sql
DBCC USEROPTIONS;
```

Microsoft specifically calls out differences such as `ARITHABORT`, `ANSI_NULLS`, `NUMERIC_ROUNDABORT`, `ROWCOUNT`, and `FORCEPLAN`. SSMS normally uses `ARITHABORT ON`, while many application connections have historically used a different value. That difference can lead the two sessions to reuse different cached plans.

For a valid comparison, make the SSMS session reproduce the application's options. Do not treat `SET ARITHABORT ON` as a universal production fix: it can merely place the test in a different plan-cache bucket and hide the underlying sensitivity.

You can inspect attributes attached to a cached plan when you have the required server-state permission:

```sql
SELECT
    pa.attribute,
    pa.value,
    st.text
FROM sys.dm_exec_cached_plans AS cp
CROSS APPLY sys.dm_exec_plan_attributes(cp.plan_handle) AS pa
CROSS APPLY sys.dm_exec_sql_text(cp.plan_handle) AS st
WHERE pa.attribute IN ('set_options', 'dbid')
  AND st.text LIKE N'%usp_GetCustomerOrders%';
```

## Compare the Plans and Runtime Evidence

Capture actual execution plans only with appropriate overhead and data-sensitivity controls. An actual plan includes runtime row counts and warnings; an estimated plan does not execute the query and lacks those runtime facts.

Compare the application-like and SSMS executions for:

- estimated versus actual rows at the first meaningful divergence;
- different indexes, join algorithms, or join order;
- implicit-conversion warnings;
- spills, excessive memory grants, and parallelism behavior;
- compile-time parameter values in plan properties;
- different plan IDs and performance distributions in Query Store.

Query Store is preferable to relying only on the current plan cache because it retains plan and runtime history. Group results by plan, interval, and application context where available; averages alone can conceal one bad parameter range.

## Reproduce the Application Faithfully

Build an SSMS test that uses the same parameterized call:

```sql
SET ARITHABORT OFF;  -- Only if this matches the captured client session.
SET ANSI_NULLS ON;

EXEC Sales.usp_GetCustomerOrders
    @CustomerId = 41792,
    @StartDate = '2026-07-01T00:00:00';
```

Also reproduce the transaction boundary. A request running inside an application transaction can wait behind locks that are absent in an isolated SSMS test. Check current blockers and the application's transaction lifecycle rather than adding `NOLOCK`, which changes correctness and does not repair the transaction design.

Run both tests against the same listener or server, database, login permissions, and time window. A read-only routed application connection may reach a secondary while SSMS reaches the primary. Different network paths and different client machines also require separate measurement.

## Choose a Fix for the Proven Cause

- **Different or skewed parameters:** tune the query and indexes for the distribution; consider Parameter Sensitive Plan optimization on SQL Server 2022 with compatibility level 160, `OPTION (RECOMPILE)` for an appropriate low-frequency statement, or another targeted parameter-sensitivity remedy.
- **Different parameter metadata:** bind the correct SQL type and length in application code.
- **Different `SET` options:** standardize intentional connection behavior and retest; do not rely on accidental cache separation.
- **Plan regression:** use Query Store to assess the previous plan and apply temporary forcing only with monitoring and a removal plan.
- **Blocking:** shorten transactions, make access order consistent, and tune the work performed while locks are held.
- **Fast server, slow client:** reduce unnecessary rows and columns, stream responsibly, and profile network and object-mapping work.

After the fix, replay representative parameter ranges through the real application path. Compare server CPU, reads, duration, returned rows, and end-to-end latency, then remove the diagnostic Extended Events session when it is no longer needed.

## Official Documentation

- [Troubleshoot a query that is slow in an application but fast in SSMS](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/troubleshoot-application-slow-ssms-fast)
- [Configure the user options server setting](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-the-user-options-server-configuration-option?view=sql-server-ver17)
- [Display an actual execution plan](https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-an-actual-execution-plan?view=sql-server-ver17)
- [Monitor performance by using Query Store](https://learn.microsoft.com/en-us/sql/relational-databases/performance/monitoring-performance-by-using-the-query-store?view=sql-server-ver17)
- [sys.dm_exec_plan_attributes](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-exec-plan-attributes-transact-sql?view=sql-server-ver17)
