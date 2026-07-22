# Validation Summary: How SQL Server Differential Backups Use the Differential Changed Map

## Status
validated

## Post Type
Technical guide / Database internals reference

## Technologies Covered
- Microsoft SQL Server
- Differential database, file, and partial backups
- Differential Changed Map (DCM) pages
- Bulk Changed Map (BCM) pages
- SQL Server transaction logs and restore sequences
- `msdb.dbo.backupset` and `msdb.dbo.backupfile` metadata
- Transact-SQL backup-history queries

## Sources Consulted
- [Microsoft Learn: Page and extent architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Microsoft Learn: Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft Learn: Backup overview (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17)
- [Microsoft Learn: Create a differential database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [Microsoft Learn: Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Microsoft Learn: `backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `backupfile` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `RESTORE HEADERONLY` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `RESTORE` arguments (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: `sys.dm_db_file_space_usage` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-objects/sys-dm-db-file-space-usage-transact-sql?view=sql-server-ver17)
- [Microsoft Learn: The transaction log](https://learn.microsoft.com/en-us/sql/relational-databases/logs/the-transaction-log-sql-server?view=sql-server-ver17)
- [Microsoft Learn: Optimize index maintenance](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17)

## Issues Found
1. **Incorrect expansion of DCM** - The post called DCM the "Differential Change Map." Microsoft documents the official name as "Differential Changed Map." Corrected the title, description, and introductory definition.
2. **Incorrect expansion of BCM** - The post called BCM the "Bulk Change Map." Microsoft documents the official name as "Bulk Changed Map." Corrected the term in the allocation-map and transaction-log discussions.
3. **Overbroad location of DCM pages** - The post said DCM pages exist in every database file, but SQL Server transaction-log files do not contain pages. Clarified that DCM pages are stored in each database data file.
4. **Incorrect `backupset` column names and imprecise size description** - The post referred to `BackupSize` and `CompressedBackupSize` as `msdb.dbo.backupset` columns; those names belong to `RESTORE HEADERONLY`, while the table columns are `backup_size` and `compressed_backup_size`. Corrected the names and clarified that they distinguish uncompressed backup-set size from stored compressed size, rather than measuring changed-extent volume alone.

## Review Notes
- The `msdb.dbo.backupset` query is valid T-SQL. The selected column names and the `D` (database) and `I` (differential database) type codes match the documented schema.
- The discussion of multi-based differentials is accurate: database-level `differential_base_lsn` and `differential_base_guid` are null for a multi-based differential, so the base must be determined per file from file-level metadata.
- `sys.dm_db_file_space_usage.modified_extent_page_count` supplies a supported changed-extent estimate in SQL Server 2016 SP2 and later. The post correctly avoids presenting that version-specific column as a universal measurement.
- The documented restore rule is `WITH NORECOVERY` on every restore except the final restore, which uses `WITH RECOVERY`; the post's restore-test guidance is consistent with that rule.
- No deprecated syntax, invalid URLs, or other technical errors were found.
