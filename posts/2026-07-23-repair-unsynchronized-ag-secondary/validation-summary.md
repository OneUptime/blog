# Validation Summary: How to Repair an Unsynchronized SQL Server Availability Group Secondary

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Microsoft SQL Server
- Always On availability groups
- Transact-SQL
- Windows Server Failover Clustering (WSFC)
- SQL Server dynamic management views and performance counters
- SQL Server backup, restore, and secondary-database seeding

## Sources Consulted
- Microsoft Learn: Monitor and troubleshoot availability groups — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/always-on-availability-groups-troubleshooting-and-monitoring-guide?view=sql-server-ver17
- Microsoft Learn: `sys.dm_hadr_availability_replica_states` — https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-hadr-availability-replica-states-transact-sql?view=sql-server-ver17
- Microsoft Learn: `sys.dm_hadr_database_replica_states` — https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-hadr-database-replica-states-transact-sql?view=sql-server-ver17
- Microsoft Learn: Resume an availability database — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/resume-an-availability-database-sql-server?view=sql-server-ver17
- Microsoft Learn: `ALTER DATABASE ... SET HADR` — https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-set-hadr?view=sql-server-ver17
- Microsoft Learn: Monitor performance for Always On availability groups — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/monitor-performance-for-always-on-availability-groups?view=sql-server-ver17
- Microsoft Learn: Troubleshoot an availability-group database in reverting state — https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/availability-groups/troubleshoot-availability-group-database-reverting-state
- Microsoft Learn: Perform a forced manual failover of an availability group — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/perform-a-forced-manual-failover-of-an-availability-group-sql-server?view=sql-server-ver17
- Microsoft Learn: Remove a secondary database from an availability group — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/remove-a-secondary-database-from-an-availability-group-sql-server?view=sql-server-ver17
- Microsoft Learn: Prepare a secondary database for an availability group — https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/manually-prepare-a-secondary-database-for-an-availability-group-sql-server?view=sql-server-ver17

## Issues Found
- **Ambiguous `NOT SYNCHRONIZING`/`REVERTING` diagnostic:** The original pattern could be read as one DMV row reporting both states. Microsoft documents that the primary reports the affected database as `NOT SYNCHRONIZING`, while the secondary reports its synchronization state as `REVERTING`. The text now identifies the replica perspective for each state.
- **Incorrect reverting-progress counter description:** The post referred generically to “recovery-queue counters,” which are not the documented counters for measuring revert progress. It now names the SQL Server Database Replica counters `Total Log Requiring Undo` and `Log Remaining for Undo`.

## Review Notes
- The DMV query, `ALTER DATABASE ... SET HADR RESUME`, `SET HADR OFF`, backup/restore statements, and availability-group join syntax are current and valid for SQL Server.
- DMV values can be local, remote, stale, or unavailable depending on which replica is queried and its connection state; the post correctly tells readers to compare the primary and affected secondary.
- The asynchronous-commit synchronization-state explanation, forced-failover data-divergence warning, manual seeding sequence, `NORECOVERY` requirement, and `WITH MOVE` guidance agree with current Microsoft documentation.
- The examples use illustrative database, availability-group, logical-file, and filesystem names that must be replaced with values from the target environment.
