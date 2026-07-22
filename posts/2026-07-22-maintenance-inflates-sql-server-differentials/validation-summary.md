# Validation Summary: How Index Rebuilds, ETL Jobs, and LOB Compaction Inflate Differential Backups

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Microsoft SQL Server Database Engine
- Full, differential, and copy-only database backups
- Differential Change Map (DCM), pages, and extents
- Rowstore and columnstore index rebuild and reorganization
- ETL operations using `UPDATE`, `MERGE`, `TRUNCATE TABLE`, staging tables, and partition switching
- Large object (LOB) storage and compaction
- Database and file shrinking
- `msdb.dbo.backupset` backup-history metadata
- SQL Server backup compression

## Sources Consulted

- [Microsoft: Page and extent architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Microsoft: Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft: Backup overview (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17)
- [Microsoft: `backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Microsoft: Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Microsoft: Backup compression (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)
- [Microsoft: Maintain indexes optimally to improve performance and reduce resource utilization](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17)
- [Microsoft: `ALTER INDEX` (Transact-SQL), including `LOB_COMPACTION`](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-index-transact-sql?view=sql-server-ver17)
- [Microsoft: `MERGE` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/merge-transact-sql?view=sql-server-ver17)
- [Microsoft: `TRUNCATE TABLE` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/truncate-table-transact-sql?view=sql-server-ver17)
- [Microsoft: Partitioned tables and indexes](https://learn.microsoft.com/en-us/sql/relational-databases/partitions/partitioned-tables-and-indexes?view=sql-server-ver17)
- [Microsoft: `tempdb` database](https://learn.microsoft.com/en-us/sql/relational-databases/databases/tempdb-database?view=sql-server-ver17)
- [Microsoft: Shrink a database](https://learn.microsoft.com/en-us/sql/relational-databases/databases/shrink-a-database?view=sql-server-ver17)

## Issues Found

- The post said that a differential backup stores changed data pages. Differential tracking and backup inclusion operate at extent granularity: one DCM bit represents an eight-page, 64-KiB extent, and a changed extent is included in the differential. Changed "data pages" was corrected to changed "data extents."
- The ETL list grouped temporary and durable objects in a way that could imply that work in `tempdb` enlarges a user-database differential backup. The text now distinguishes durable staging objects from work confined to `tempdb`, which cannot contribute to a user-database backup because `tempdb` is a separate system database and cannot itself be backed up.

## Review Notes

The `msdb.dbo.backupset` query is syntactically valid and all selected columns and backup type codes are current and documented. `backup_size` and `compressed_backup_size` are correctly kept separate, and the post correctly explains DCM extent tracking, cumulative differential bases, copy-only full behavior, index rebuild/reorganization effects, LOB page compaction, partition switching, shrink side effects, and compression variability. No deprecated APIs or version-specific inaccuracies were found.
