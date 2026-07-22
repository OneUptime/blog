# Validation Summary: When a Differential Backup Is Nearly as Large as a Full Backup

## Status

validated

## Post Type

Operational guide

## Technologies Covered

- Microsoft SQL Server
- Full and differential database backups
- SQL Server backup compression
- Transact-SQL backup-history queries
- SQL Server restore and recovery workflows
- Recovery time objectives (RTO)

## Sources Consulted

- [Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Page and extent architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Create a differential database backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [Restore a differential database backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [Copy-only backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Full database backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/full-database-backups-sql-server?view=sql-server-ver17)
- [`backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [`RESTORE HEADERONLY` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [Backup compression (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)
- [Back up and restore of SQL Server databases](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-and-restore-of-sql-server-databases?view=sql-server-ver17)

## Issues Found

No technical issues found.

## Review Notes

- The Transact-SQL query is syntactically valid, uses documented `msdb.dbo.backupset` columns, and correctly selects full database (`D`) and differential database (`I`) backup records.
- The explanation correctly describes 64-KiB extents, DCM tracking, cumulative differential backups, copy-only full behavior, compression variability, and the documented full-with-`NORECOVERY` followed by differential restore sequence.
- The base-identification discussion applies to the single-based database differentials covered by the post. Multi-based differential file or partial backups require file-level base metadata and are outside the post's scope.
- The Microsoft Learn links are current and resolve to the relevant SQL Server 2025 (17.x) documentation set.
