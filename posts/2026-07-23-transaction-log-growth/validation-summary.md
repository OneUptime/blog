# Validation Summary: Why the SQL Server Transaction Log Keeps Growing—and How to Stop It Safely

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (T-SQL)
- SQL Server transaction logs and virtual log files
- Full, bulk-logged, and simple recovery models
- Transaction-log backups and restore chains
- Always On availability groups
- Transactional replication and change data capture
- Extended Events

## Sources Consulted

- [The transaction log](https://learn.microsoft.com/en-us/sql/relational-databases/logs/the-transaction-log-sql-server?view=sql-server-ver17)
- [SQL Server transaction log architecture and management guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-log-architecture-and-management-guide?view=sql-server-ver17)
- [Troubleshoot a full transaction log (SQL Server error 9002)](https://learn.microsoft.com/en-us/sql/relational-databases/logs/troubleshoot-a-full-transaction-log-sql-server-error-9002?view=sql-server-ver17)
- [Manage the size of the transaction log file](https://learn.microsoft.com/en-us/sql/relational-databases/logs/manage-the-size-of-the-transaction-log-file?view=sql-server-ver17)
- [sys.dm_db_log_space_usage](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-db-log-space-usage-transact-sql?view=sql-server-ver17)
- [sys.database_files](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-database-files-transact-sql?view=sql-server-ver17)
- [sys.dm_db_log_info](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-db-log-info-transact-sql?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [Backup compression](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [DBCC OPENTRAN](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-opentran-transact-sql?view=sql-server-ver17)
- [KILL](https://learn.microsoft.com/en-us/sql/t-sql/language-elements/kill-transact-sql?view=sql-server-ver17)
- [ALTER DATABASE file and filegroup options](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-file-and-filegroup-options?view=sql-server-ver17)
- [DBCC SHRINKFILE](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-shrinkfile-transact-sql?view=sql-server-ver17)
- [View or change the recovery model of a database](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/view-or-change-the-recovery-model-of-a-database-sql-server?view=sql-server-ver17)
- [SQL Server deprecated features](https://learn.microsoft.com/en-us/sql/relational-databases/performance-monitor/sql-server-deprecated-features-object?view=sql-server-ver17)
- [Error 9002: transaction log large due to AVAILABILITY_REPLICA](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/availability-groups/error-9002-transaction-log-large)

## Issues Found

- The example `BACKUP LOG` command used `COMPRESSION`, which is not supported by every SQL Server edition. Removed that option so the generic example also works on editions such as Express; environments with Enterprise, Standard, or Developer edition can add compression according to their backup policy.
- The copy-only backup warning incorrectly implied that `COPY_ONLY` does not avoid affecting the regular log-backup sequence. Clarified that a copy-only log backup leaves the regular sequence unchanged but never truncates the transaction log, so it cannot resolve a `LOG_BACKUP` reuse wait.
- The post presented the default trace as a current autogrowth-monitoring option. Marked it as deprecated and made Extended Events or an intentional monitoring pipeline the recommended approach.
- The post instructed readers to set the intended file size after shrinking directly to that target. Because `DBCC SHRINKFILE` changes the physical size and `ALTER DATABASE ... MODIFY FILE (SIZE = ...)` can only enlarge a file, changed the instruction to verify the resulting size and configure the intended growth increment.
- The recovery-model warning said only that a “data backup” is required after returning from simple to full recovery. Replaced this with the documented requirement for a full or differential database backup to establish a new log chain.

## Review Notes

- The `sys.dm_db_log_info` query requires SQL Server 2016 SP2 or later. On SQL Server 2022 and later, it requires `VIEW DATABASE PERFORMANCE STATE`; the other diagnostic DMVs also require appropriate performance-state permissions.
- The sample 64-GB file size, 1-GB growth increment, and Windows backup path are correctly identified as examples and must be adapted to the workload and host platform.
- The remaining T-SQL examples are syntactically valid for supported SQL Server releases, and the operational distinctions among truncation, shrinking, pre-sizing, and autogrowth agree with current Microsoft guidance.
