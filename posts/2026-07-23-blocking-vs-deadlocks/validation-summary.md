# Validation Summary: SQL Server Blocking vs. Deadlocks: How to Capture and Fix Both

## Status
validated

## Post Type
Technical guide / troubleshooting guide

## Technologies Covered
- Microsoft SQL Server
- Transact-SQL
- SQL Server dynamic management views and functions
- SQL Server Extended Events
- SQL Server Management Studio
- Azure SQL Managed Instance
- Query Store
- Row-versioning isolation (`READ_COMMITTED_SNAPSHOT` and snapshot isolation)

## Sources Consulted
- Microsoft Learn — Understand and resolve SQL Server blocking problems: https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/performance/understand-resolve-blocking
- Microsoft Learn — `sys.dm_exec_requests` (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-exec-requests-transact-sql?view=sql-server-ver17
- Microsoft Learn — Deadlocks guide: https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-deadlocks-guide?view=sql-server-ver17
- Microsoft Learn — MSSQLSERVER_1205: https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-1205-database-engine-error?view=sql-server-ver17
- Microsoft Learn — Use the `system_health` session: https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/use-the-system-health-session?view=sql-server-ver17
- Microsoft Learn — `CREATE EVENT SESSION` (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/create-event-session-transact-sql?view=sql-server-ver17
- Microsoft Learn — Extended Events targets: https://learn.microsoft.com/en-us/sql/relational-databases/extended-events/targets-for-extended-events-in-sql-server?view=sql-server-ver17
- Microsoft Learn — Server configuration: blocked process threshold: https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/blocked-process-threshold-server-configuration-option?view=sql-server-ver17
- Microsoft Learn — Increase or disable blocked process threshold: https://learn.microsoft.com/en-us/sql/relational-databases/policy-based-management/increase-or-disable-blocked-process-threshold?view=sql-server-ver17
- Microsoft Learn — `sp_configure` (Transact-SQL): https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-configure-transact-sql?view=sql-server-ver17
- Microsoft Learn — Transaction locking and row versioning guide: https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver17
- Microsoft Learn — `SET DEADLOCK_PRIORITY` (Transact-SQL): https://learn.microsoft.com/en-us/sql/t-sql/statements/set-deadlock-priority-transact-sql?view=sql-server-ver17
- Microsoft Learn — Latest updates and version history for SQL Server: https://learn.microsoft.com/en-us/troubleshoot/sql/releases/download-and-install-latest-updates
- Microsoft Learn — Go SQL Server driver error handling and retry patterns: https://learn.microsoft.com/en-us/sql/connect/golang/error-handling?view=sql-server-ver17

## Issues Found
- The introduction said blocking and deadlocks both involve incompatible locks. SQL Server deadlocks can also involve non-lock resources, including worker threads and communication buffers. The introduction now describes incompatible locks as common rather than universal and names non-lock examples.
- The deadlock overview referred to one “other transaction,” which assumed a two-participant deadlock. It now refers to the other participants so that multi-participant cycles are covered.
- The live-blocking instructions treated every nonzero `blocking_session_id` as a session. SQL Server documents negative values for special owners such as orphaned distributed transactions, deferred recovery transactions, and latch owners whose session ID is unavailable. The instructions now say to walk positive session IDs and explain the negative values.
- The DMV query excluded the current session and therefore could return no useful rows without permission to view other sessions. The post now states the required `VIEW SERVER STATE` permission for SQL Server 2019 and earlier and `VIEW SERVER PERFORMANCE STATE` for SQL Server 2022 and later.
- The blocked-process configuration enabled `show advanced options` without restoring it. The example now sets it back to `0` after applying the threshold, following Microsoft guidance to expose advanced options only temporarily.
- The Extended Events example used a local path without stating its prerequisites or the Azure SQL Managed Instance storage difference. The post now requires an existing directory writable by the SQL Server service account and notes that Managed Instance `event_file` targets use Azure Storage.

The DMV statement-extraction expression, `sp_configure` calls, Extended Events DDL, event and target names, file rollover settings, deadlock retry guidance, isolation-level discussion, lock-escalation cautions, and documentation links were otherwise verified as current and correct.

## Review Notes
- The article is version-neutral and remains accurate for supported SQL Server releases, including SQL Server 2025. Optimized locking in newer environments can reduce the lock footprint and likelihood of escalation, but the article's conditional wording remains correct.
- Blocked process reports are generated on a best-effort basis and can repeat once per reporting interval for each blocked task. The post appropriately advises assessing event volume and taking repeated timestamped captures.
- `system_health` has limited event-file retention. The recommendation to use a dedicated session when longer retention or a clear operational boundary is required is correct.
