# How to Capture SQL Server Blocking Chains with Blocked Process Reports and Extended Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Extended Events, Blocking, Lock Monitoring, Incident Response

Description: Capture durable SQL Server waiter-to-blocker evidence with a bounded blocked-process threshold and Extended Events file target, then reconstruct chains safely.

---

Polling `sys.dm_exec_requests` can miss a blocking incident that begins and ends between samples. SQL Server's blocked process report asks the deadlock monitor to emit an event when a task has waited beyond a configured threshold; Extended Events can persist those reports for later chain reconstruction.

This is thresholded, best-effort evidence—not a real-time notification for every lock wait.

## Set a responsible reporting threshold

Use `0`, the default, for `blocked process threshold (s)` to disable reports, or `5` through `86,400` seconds to enable them. Values `1` through `4` can be configured but generate no reports. Microsoft recommends at least 5 seconds because the deadlock monitor normally wakes every 5 seconds:

```sql
EXEC sys.sp_configure 'show advanced options', 1;
RECONFIGURE;

EXEC sys.sp_configure 'blocked process threshold (s)', 20;
RECONFIGURE;
```

Choose a threshold below the user-facing latency budget but high enough to avoid recording normal short contention. A task can be reported once per reporting interval, or at multiples of it, and scheduling is best effort. System tasks and waits on resources whose deadlocks SQL Server does not detect do not generate blocked process reports.

Changing this server setting requires the appropriate server configuration permission and affects the whole instance. Record the owner and expected event rate.

## Persist reports with Extended Events

The following is a SQL Server-on-Linux example. Use an existing, access-controlled directory appropriate to the host; do not copy the path to Windows or a managed service unchanged.

```sql
CREATE EVENT SESSION [blocked_process_reports] ON SERVER
ADD EVENT sqlserver.blocked_process_report
ADD TARGET package0.event_file (
  SET filename = N'/var/opt/mssql/log/blocked_process_reports.xel',
      max_file_size = (100),
      max_rollover_files = (5)
)
WITH (
  MAX_MEMORY = 4096 KB,
  EVENT_RETENTION_MODE = ALLOW_SINGLE_EVENT_LOSS,
  MAX_DISPATCH_LATENCY = 5 SECONDS,
  STARTUP_STATE = ON
);
GO

ALTER EVENT SESSION [blocked_process_reports]
ON SERVER STATE = START;
GO
```

The rollover settings bound on-host storage. Confirm the SQL Server service account can write the directory, monitor target errors and disk space, and secure `.xel` files: event payloads include process details and input buffers that can contain sensitive SQL.

On SQL Server 2022 and later, creating a session can be delegated with `CREATE ANY EVENT SESSION`; starting it additionally requires `ALTER ANY EVENT SESSION ENABLE` or its parent `ALTER ANY EVENT SESSION`. Earlier releases use `ALTER ANY EVENT SESSION` for both. Viewing session data requires server performance visibility—`VIEW SERVER PERFORMANCE STATE` on SQL Server 2022 and later, and `VIEW SERVER STATE` on earlier releases. Recheck permissions for Azure SQL Database and database-scoped Extended Events, whose syntax and target URL differ.

## Verify collection before an incident

Confirm the session is running:

```sql
SELECT s.name,
       xs.create_time,
       xs.largest_event_dropped_size
FROM sys.server_event_sessions AS s
LEFT JOIN sys.dm_xe_sessions AS xs
  ON xs.name = s.name
WHERE s.name = N'blocked_process_reports';
```

Generate a controlled lock wait in a nonproduction database that exceeds the threshold, then read the files:

```sql
SELECT object_name,
       timestamp_utc,
       file_name,
       file_offset,
       CAST(event_data AS xml) AS event_xml
FROM sys.fn_xe_file_target_read_file(
  N'/var/opt/mssql/log/blocked_process_reports*.xel',
  NULL, NULL, NULL
)
ORDER BY timestamp_utc;
```

Use the wildcard across rollover files. Save `file_name` and `file_offset` as an ingestion checkpoint, but handle rollover and replacement safely rather than assuming an offset exists forever.

## Reconstruct the chain

Each report contains a blocked-process section and a blocking-process section. Parse an edge with fields such as:

```text
event timestamp
database and resource
waiter process identifier, SPID, batch ID (SBID), and execution-context ID (ECID)
blocker SPID, SBID, and ECID
wait time and wait resource
transaction identifier, count, and start time when present
status, client application, host, login
input buffers after redaction
```

Build a directed edge from waiter to blocker for reports in a narrow time bucket. Repeatedly follow the blocker if its time-scoped SPID/SBID/ECID tuple appears as a waiter in another edge; the terminal node is the head blocker observed in that snapshot.

Do not key a long-lived graph by SPID alone. Session IDs are reused. Include event time, SPID/SBID/ECID, transaction identifiers and timing, database and resource, and the waiter's process identifier when present. Reports arrive at slightly different times, so a reconstructed graph is an approximation of changing server state.

Sample `sys.dm_exec_requests`, `sys.dm_tran_locks`, `sys.dm_os_waiting_tasks`, and transaction DMVs alongside the event for current context. Keep deadlock monitoring separate: SQL Server resolves a deadlock by choosing a victim, and the built-in `system_health` session captures the `xml_deadlock_report` event by default rather than waiting for the blocked-process threshold.

## Alert and respond safely

Useful incident signals are:

- age of the oldest reported waiter;
- distinct waiters by head blocker;
- repeated reports for the same transaction;
- open-transaction age and client ownership;
- blocked request latency, timeouts, and retry rate;
- storage or memory symptoms that made a transaction slow.

The head blocker is not automatically the faulty session. It may be doing essential work, waiting on storage, or preparing to commit. Before killing it, identify business ownership, rollback size, replication and recovery implications, idempotent retry behavior, and the cost to every dependent waiter.

## Official Documentation

- [SQL Server blocked process threshold option](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/blocked-process-threshold-server-configuration-option?view=sql-server-ver17)
- [SQL Server Extended Events quick start](https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/quick-start-extended-events-in-sql-server?view=sql-server-ver17)
- [SQL Server Extended Events targets](https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/targets-for-extended-events-in-sql-server?view=sql-server-ver17)
- [`sys.fn_xe_file_target_read_file`](https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-fn-xe-file-target-read-file-transact-sql?view=sql-server-ver17)
- [Understand and resolve SQL Server blocking](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/understand-resolve-blocking)

## Conclusion

Set a bounded threshold that reflects the latency budget, persist `blocked_process_report` events to a protected rollover file, and verify collection with a controlled test. Reconstruct time-scoped waiter-to-blocker edges using more than SPID alone, then validate the head blocker's transaction and business impact before taking action.
