# Validation Summary: Why SQL Server Differential Backups Keep Getting Larger

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Microsoft SQL Server differential and full database backups
- Differential Changed Map (DCM) pages, data pages, and extents
- SQL Server backup compression and `msdb.dbo.backupset`
- `RESTORE HEADERONLY` and `RESTORE FILELISTONLY`
- Copy-only backups and differential base metadata
- SQL Server index and database maintenance
- Backup restore testing and `DBCC CHECKDB`

## Sources Consulted

- [Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Page and extent architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [`backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [`backupfile` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [`RESTORE HEADERONLY` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [`RESTORE FILELISTONLY` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Copy-only backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Backup compression (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)
- [Maintain indexes optimally](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17)
- [`ALTER TABLE` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql?view=sql-server-ver17)
- [Back up and restore of SQL Server databases](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-and-restore-of-sql-server-databases?view=sql-server-ver17)
- [Backup encryption (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-encryption?view=sql-server-ver17)
- [`DBCC CHECKDB` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)

## Issues Found

- The ETL examples referred to a "staging swap" as a possible wide physical-change operation. SQL Server partition switching reassigns data and is primarily a metadata operation, so this was changed to "staging-table load," which accurately identifies the extent-changing part of the workflow.
- The differential-base check did not state which fields on the full backup correspond to `DifferentialBaseLSN` and `DifferentialBaseGUID`. It now maps them to the full backup's `FirstLSN` and `BackupSetGUID`, respectively.
- Multi-based differential guidance said only to inspect file-level metadata. It now identifies `RESTORE FILELISTONLY` as the command that exposes the per-file base information.
- The phrase "older recovery chains" could imply that taking a new full backup starts a new transaction-log chain. It was replaced with explicit guidance to retain the older full and any differential or log backups required for recovery.
- Restore validation listed restoration and `DBCC CHECKDB` as separate activities. It now makes clear that periodic test restores should be followed by `DBCC CHECKDB` and business validation.

## Review Notes

Both T-SQL examples are syntactically valid and use current, documented SQL Server features. The `backup_size` and `compressed_backup_size` columns are appropriate for comparing uncompressed-equivalent and stored backup sizes; `backup_size` can be an estimate for VSS backups. Backup history in `msdb` can be pruned, so the documented header inspection is important when history is incomplete.
