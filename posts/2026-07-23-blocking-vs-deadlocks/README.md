# SQL Server Blocking vs. Deadlocks: How to Capture and Fix Both

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Blocking, Deadlock, Extended Events, Concurrency

Description: Distinguish SQL Server blocking chains from deadlock cycles, capture durable evidence for each, and fix the transaction behavior that caused them.

---

Blocking and deadlocks are often discussed together because both commonly involve incompatible locks, but they are different incidents. Deadlocks can also involve non-lock resources such as worker threads or communication buffers.

**Blocking** is a wait: one session holds a lock and another waits for it. Short blocking is expected in a lock-based relational database. It becomes a problem when the holder runs too long, leaves a transaction open, or creates an unacceptable queue.

A **deadlock** is a cycle: each participant waits for a resource held by another participant in the cycle. SQL Server detects the cycle, selects a victim, rolls back that victim's transaction, and returns error 1205. The other participants can continue.

Treating both as “kill the blocker” loses the evidence required for a durable fix.

## Capture Live Blocking

During an active incident, start with current requests:

```sql
SELECT
    r.session_id,
    r.blocking_session_id,
    r.status,
    r.wait_type,
    r.wait_time,
    r.wait_resource,
    r.open_transaction_count,
    r.cpu_time,
    r.logical_reads,
    r.total_elapsed_time,
    DB_NAME(r.database_id) AS database_name,
    SUBSTRING
    (
        st.text,
        (r.statement_start_offset / 2) + 1,
        ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(st.text)
            ELSE r.statement_end_offset
          END - r.statement_start_offset) / 2) + 1
    ) AS running_statement
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS st
WHERE r.session_id <> @@SPID
ORDER BY r.blocking_session_id DESC, r.session_id;
```

Seeing other sessions requires `VIEW SERVER STATE` on SQL Server 2019 and earlier, or `VIEW SERVER PERFORMANCE STATE` on SQL Server 2022 and later.

Walk positive `blocking_session_id` values until reaching the session that is not itself blocked: the head blocker. Negative values identify special owners such as orphaned distributed or deferred recovery transactions, or latch owners whose session ID is unavailable. A head blocker may be sleeping and therefore absent from `sys.dm_exec_requests`; correlate `sys.dm_exec_sessions`, `sys.dm_tran_session_transactions`, and `sys.dm_tran_active_transactions` to find a session with an open transaction.

Record the chain repeatedly with timestamps. One DMV snapshot can disappear as soon as a lock is released and cannot show how the queue evolved.

## Capture Blocked Process Reports

SQL Server does not emit blocked process reports by default. Configure a threshold in seconds only after assessing the event volume. Microsoft recommends a value of at least five seconds; a value of zero disables reports.

```sql
EXEC sys.sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sys.sp_configure 'blocked process threshold (s)', 10;
RECONFIGURE;
EXEC sys.sp_configure 'show advanced options', 0;
RECONFIGURE;
```

Create a focused Extended Events session:

```sql
CREATE EVENT SESSION [ConcurrencyEvidence] ON SERVER
ADD EVENT sqlserver.blocked_process_report,
ADD EVENT sqlserver.xml_deadlock_report
ADD TARGET package0.event_file
(
    SET filename = N'D:\XEvents\ConcurrencyEvidence.xel',
        max_file_size = 100,
        max_rollover_files = 5
);

ALTER EVENT SESSION [ConcurrencyEvidence] ON SERVER STATE = START;
```

Before starting the session, replace the filename with a path to an existing local directory that the SQL Server service account can write to. On Azure SQL Managed Instance, an `event_file` target must use Azure Storage instead of a local path.

The blocked process report includes blocked and blocking process details, lock modes, resources, and execution context. Secure the files because SQL text can contain sensitive values. Disable the session and reset the threshold if the capture was temporary.

## Retrieve Deadlock Graphs

The built-in `system_health` Extended Events session captures `xml_deadlock_report` by default on SQL Server and SQL Managed Instance. Inspect its event-file target in SSMS or use a dedicated session like the one above when you need longer retention and an explicit operational boundary.

A deadlock graph tells you:

- victim and surviving processes;
- requested and owned locks;
- resource type, object or key identifiers, and lock modes;
- statements and execution stacks;
- transaction timing, isolation level, client, login, and host context;
- victim-selection information such as deadlock priority and rollback cost.

Read it as a cycle. For every edge, write down “session A owns X and requests Y.” Then locate the reverse dependency. The statement that receives error 1205 is not necessarily the statement whose design should change.

## Diagnose Common Blocking Patterns

### A Sleeping Session with an Open Transaction

An application begins a transaction, changes rows, then returns the connection to idle work or waits for user input. Locks remain until commit or rollback. Fix the transaction boundary and ensure cancellation and exception paths roll back.

### A Long Modification or Scan

Large batches can hold many locks and may escalate. Improve access paths, make the transaction do less work, and batch changes when correctness permits. Do not assume disabling lock escalation is safe; that can substantially increase lock memory.

### Reader-Writer Contention

Tune queries first. If the application semantics allow row versioning, evaluate `READ_COMMITTED_SNAPSHOT` or snapshot isolation with a full test of behavior and TempDB/version-store capacity. Changing isolation is an application correctness decision, not only a DBA performance switch.

### Schema Locks

Compilation and data-definition operations can participate in schema stability and schema modification blocking. Schedule schema changes deliberately and keep deployment transactions narrow.

## Diagnose Common Deadlock Shapes

### Opposite Object Order

Transaction A updates `Customers` and then `Orders`; transaction B updates `Orders` and then `Customers`. Make all code paths access shared resources in the same order.

### Lookup or Scan Deadlocks

An inefficient access path touches more keys or pages and holds locks longer. A suitable index or query rewrite can reduce the lock footprint, but validate its effect on writes and other plans.

### Conversion Deadlocks

Two sessions hold compatible shared or update-related locks and both attempt an incompatible conversion. Inspect lock modes and transaction logic; using update locks in a proven queue pattern may help, but blanket hints can create different contention.

### Parallel or Multi-Resource Deadlocks

Do not infer the fix from a single node. Use the full graph and execution plans to understand all workers and resources. Current SQL Server cumulative updates should also be part of the support baseline.

## Fix Transactions, Then Add Resilience

Durable fixes usually combine:

1. short transactions with no network or user wait inside them;
2. consistent object and row access order;
3. selective, correctly typed predicates and appropriate indexes;
4. the least restrictive isolation level that preserves required semantics;
5. predictable batch sizes and deployment behavior.

Applications should handle error 1205 by retrying the **entire transaction**, not only the final statement. Roll back local state, use a bounded retry count with randomized backoff, and preserve idempotency. Retries reduce user-visible failures but do not excuse a recurring deadlock design.

Avoid `NOLOCK` as a generic solution: it permits dirty reads and other inconsistent results and does not eliminate every form of blocking. Avoid `KILL` unless the incident owner has assessed the business transaction and rollback impact; killing a large transaction can prolong recovery work.

After deploying a fix, replay the competing code paths under concurrency. Confirm fewer blocked-process reports or deadlocks, unchanged result correctness, acceptable TempDB and log use, and no regression in Query Store. Keep a representative deadlock graph with the incident record so the claimed cause remains auditable.

## Official Documentation

- [Understand and resolve SQL Server blocking problems](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/understand-resolve-blocking)
- [Deadlocks guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-deadlocks-guide?view=sql-server-ver17)
- [Use the system_health session](https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/use-the-system-health-session?view=sql-server-ver17)
- [blocked process threshold server configuration option](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/blocked-process-threshold-server-configuration-option?view=sql-server-ver17)
- [Transaction locking and row versioning guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver17)
