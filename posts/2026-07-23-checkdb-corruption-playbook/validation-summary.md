# Validation Summary: DBCC CHECKDB Found Corruption: A Safe SQL Server Recovery Playbook

## Status

validated

## Post Type

Technical guide / disaster-recovery playbook

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL
- `DBCC CHECKDB`, `DBCC CHECKCONSTRAINTS`, and DBCC repair options
- SQL Server backup, tail-log backup, page restore, file/filegroup restore, and database restore
- `msdb.dbo.suspect_pages` and `sys.databases`
- `PAGE_VERIFY CHECKSUM`
- Always On availability groups and automatic page repair

## Sources Consulted

- [Troubleshoot database consistency errors reported by DBCC CHECKDB](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/database-file-operations/troubleshoot-dbcc-checkdb-errors)
- [DBCC CHECKDB (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)
- [DBCC CHECKCONSTRAINTS (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkconstraints-transact-sql?view=sql-server-ver17)
- [Manage the suspect_pages table (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/manage-the-suspect-pages-table-sql-server?view=sql-server-ver17)
- [Restore pages (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-pages-sql-server?view=sql-server-ver17)
- [Tail-log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Restore and recovery overview (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-and-recovery-overview-sql-server?view=sql-server-ver17)
- [ALTER DATABASE SET options (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-set-options?view=sql-server-ver17)
- [Possible media errors during backup and restore (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/possible-media-errors-during-backup-and-restore-sql-server?view=sql-server-ver17)
- [Always On availability groups overview](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-ver17)
- [MSSQLSERVER errors 823](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-823-database-engine-error?view=sql-server-ver17), [824](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-824-database-engine-error?view=sql-server-ver17), and [825](https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/mssqlserver-825-database-engine-error?view=sql-server-ver17)

## Issues Found

- The page-restore discussion treated full and bulk-logged recovery too similarly. Microsoft documents that page restore applies to both recovery models but generally does not work with bulk-logged recovery. Changed the wording to describe bulk-logged support as limited.
- The recovery-options list referred to a “full/log chain,” which could imply that page restore must begin with a full database backup. Microsoft supports starting a page restore with a full database, file, or filegroup backup containing the page. Changed this to “data-backup/log sequence.”

## Review Notes

- The T-SQL snippets are syntactically valid for current supported SQL Server versions. `ALL_ERRORMSGS` remains valid but is redundant on current versions because all per-object errors are displayed by default.
- The repair transaction guidance correctly distinguishes ordinary logged `REPAIR_*` work, which can be reviewed and rolled back inside a user transaction, from emergency-mode repair, which cannot be run that way.
- In an operational runbook, also guard the single-user transition against competing connections and verify that asynchronous statistics updates cannot take the only connection.
