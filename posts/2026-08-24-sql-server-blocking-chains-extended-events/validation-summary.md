# Validation Summary: Capture SQL Server Blocking Chains with Extended Events

## Status
validated

## Post Type
Technical tutorial / incident-response guide

## Technologies Covered
- Microsoft SQL Server
- Transact-SQL (`sp_configure`, `RECONFIGURE`, and Extended Events DDL)
- SQL Server Extended Events
- `blocked_process_report` and `xml_deadlock_report` events
- `event_file` targets and `.xel` rollover files
- SQL Server dynamic management views and functions
- SQL Server on Linux
- Azure SQL Database and database-scoped Extended Events (caveats)

## Sources Consulted
- [Server configuration: blocked process threshold](https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/blocked-process-threshold-server-configuration-option?view=sql-server-ver17) - effective range, reporting cadence, exclusions, and best-effort behavior.
- [Increase or disable blocked process threshold](https://learn.microsoft.com/en-us/sql/relational-databases/policy-based-management/increase-or-disable-blocked-process-threshold?view=sql-server-ver17) - behavior of values `0` and `1` through `4`.
- [`sys.sp_configure`](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-configure-transact-sql?view=sql-server-ver17) - server scope, syntax, `RECONFIGURE`, and permissions.
- [`CREATE EVENT SESSION`](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-event-session-transact-sql?view=sql-server-ver17) - event-session syntax, session options, targets, startup behavior, and creation permissions.
- [`ALTER EVENT SESSION`](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-event-session-transact-sql?view=sql-server-ver17) and [Extended Events permissions](https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/extended-events?view=sql-server-ver17#permissions) - immediate start syntax and SQL Server 2022 granular permissions.
- [Extended Events targets](https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/targets-for-extended-events-in-sql-server?view=sql-server-ver17) - `event_file`, `.xel`, `max_file_size`, `max_rollover_files`, local paths, Azure Storage, and sensitive-data guidance.
- [Security and permissions guide for SQL Server on Linux](https://learn.microsoft.com/en-us/sql/linux/security/permissions-guide?view=sql-server-ver17) - default XE log path and file-system ownership.
- [`sys.dm_xe_sessions`](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-xe-sessions-transact-sql?view=sql-server-ver17) - active-session rows, `create_time`, `largest_event_dropped_size`, and version-specific view permissions.
- [`sys.fn_xe_file_target_read_file`](https://learn.microsoft.com/en-us/sql/relational-databases/system-functions/sys-fn-xe-file-target-read-file-transact-sql?view=sql-server-ver17) - function arguments, wildcard behavior, returned columns, checkpoint semantics, and Azure URL differences.
- [Understand and resolve SQL Server blocking](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/understand-resolve-blocking) - blocking-chain diagnosis, Extended Events, and supporting DMVs.
- [Microsoft blocked-process XML example](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/configure-troubleshoot-subscriptionstreamsof-distribution-agent) - blocked and blocking process nodes, SPID/SBID/ECID, transaction fields, and input buffers.
- [SQL Server deadlocks guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-deadlocks-guide?view=sql-server-ver17) and [`system_health` session](https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/use-the-system-health-session?view=sql-server-ver17) - automatic deadlock resolution and default `xml_deadlock_report` capture.

## Issues Found
1. **Threshold values `1` through `4` were described as unaccepted** - SQL Server can configure these values, but the five-second monitor cadence means they generate no blocked-process reports. Reworded the range to distinguish the disabling value `0`, effective values `5` through `86,400`, and ineffective values `1` through `4`.
2. **Delegated permissions covered creation but not the immediate start in the sample** - `CREATE ANY EVENT SESSION` on SQL Server 2022 and later permits creation, but `ALTER EVENT SESSION ... STATE = START` additionally needs `ALTER ANY EVENT SESSION ENABLE` or its parent permission. Added that requirement and retained the earlier-version `ALTER ANY EVENT SESSION` guidance.
3. **The reconstruction fields implied that both XML process nodes have a process `id`** - Official blocked-process XML examples place `id` on the blocked/waiter node, while the blocking node is identified by SPID, batch ID (SBID), and execution-context ID (ECID) and commonly includes a transaction ID. Corrected the field list and time-scoped correlation guidance to use the SPID/SBID/ECID tuple, transaction identifiers/timing, and the waiter's process identifier when present.
4. **The built-in deadlock session name was split incorrectly** - Changed “system `health` session” to the actual session name, `system_health`, which captures `xml_deadlock_report` by default.

## Review Notes
- The `CREATE EVENT SESSION` and `ALTER EVENT SESSION` statements are syntactically valid and use current Extended Events APIs. The `event_file` settings retain five rollover files in addition to the current file, so the configured set is bounded to six files rather than five files total.
- The verification query correctly uses the absence of a matching `sys.dm_xe_sessions` row to indicate that the defined session isn't running. Its projected columns exist and the stated SQL Server 2022 permission split is correct.
- The local wildcard and four-argument `sys.fn_xe_file_target_read_file` call are valid. `timestamp_utc` is documented for SQL Server 2017 and later, consistent with the post's SQL Server-on-Linux example.
- Because `file_offset` is a block offset and resume is exclusive of the supplied checkpoint, an ingestion process should advance its checkpoint only after processing all events at that offset. The post's warning about rollover and replacement is correct.
- `ALLOW_SINGLE_EVENT_LOSS` permits loss under buffer pressure, and the post correctly characterizes the reports as best-effort. `largest_event_dropped_size` reports the largest event that didn't fit in a session buffer; it isn't a count of every possible loss condition.
- The Azure SQL Database warning is correct: database-scoped session syntax and Azure Storage URLs differ from this local, server-scoped Linux example.
