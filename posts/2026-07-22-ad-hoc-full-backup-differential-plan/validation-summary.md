# Validation Summary: Can an Ad Hoc Full Backup Break Your Differential Backup Plan?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Full, differential, copy-only, and transaction log backups
- Transact-SQL `BACKUP DATABASE`
- `msdb` backup history tables
- `RESTORE HEADERONLY` and `RESTORE FILELISTONLY`
- Volume Shadow Copy Service (VSS) and SQL Server Writer

## Sources Consulted

- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [backupfile system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [SQL Server backup applications, VSS, and SQL Writer](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/sql-server-vss-writer-backup-guide?view=sql-server-ver17)
- [Apply transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [SQL Server backup compression](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)

## Issues Found

- The backup-history query did not return `backup_set_uuid` or `checkpoint_lsn`, so the text's instructed GUID match and the `database_backup_lsn` match could not both be performed from its output. Added both fields and documented the exact relationships between a differential and its base full backup.
- The base-matching guidance assumed the backup-set-level differential base fields would always contain values. Added the documented per-file fallback through `msdb.dbo.backupfile` or `RESTORE FILELISTONLY` for multibased differentials.
- The third-party/VSS test treated `RESTORE HEADERONLY` and `msdb.dbo.backupset` as universally available evidence. Clarified that native media should be inspected that way, while VSS jobs also require saved writer/backup-component metadata and product records; Microsoft documents that copy-only VSS backups do not update SQL Server backup history.

## Review Notes

- The central claim is correct: a conventional full database backup can establish a new differential base, while a copy-only full cannot and does not change the existing base.
- The `BACKUP DATABASE ... WITH COPY_ONLY, CHECKSUM, COMPRESSION, INIT` example is valid. `COMPRESSION` requires Enterprise, Standard, or Developer edition, and `INIT` can overwrite existing backup sets on the target media when SQL Server's overwrite checks permit, so the destination should be chosen deliberately.
- A conventional full database backup does not break the transaction log chain. Microsoft documents restore sequences that use an earlier full backup and continue through log backups taken across later full backups.
