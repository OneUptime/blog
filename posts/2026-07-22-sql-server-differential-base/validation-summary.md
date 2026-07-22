# Validation Summary: What Is the Differential Base, and Which Full Backup Does SQL Server Use?

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- Microsoft SQL Server backup and restore
- Transact-SQL (`BACKUP DATABASE`, `RESTORE DATABASE`, `RESTORE HEADERONLY`, `RESTORE FILELISTONLY`, and `RESTORE VERIFYONLY`)
- Full, differential, copy-only, file, partial, and transaction log backups
- SQL Server log sequence numbers (LSNs) and backup GUID metadata
- `msdb.dbo.backupset` backup history
- Volume Shadow Copy Service (VSS) and third-party backup integrations

## Sources Consulted

- [Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Copy-only backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [backupset (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [backupfile (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [RESTORE statements - arguments (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [Restore a differential database backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE VERIFYONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17)
- [Tail-log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [SQL Server records a backup operation in the backupset history table when you use VSS to back up files on a volume](https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/backup-restore/backup-operation-backup-history-table)

## Issues Found

- The generic restore example specified `CHECKSUM` for both backup sets without establishing that they contain backup checksums. Microsoft documents that explicit `RESTORE ... WITH CHECKSUM` fails when a backup set lacks backup checksums. Removed the explicit `CHECKSUM` options; the default restore behavior still verifies backup checksums when they are present and proceeds when they are absent.

## Review Notes

- The claims about conventional full backups resetting the differential base, copy-only full backups not affecting it, and `COPY_ONLY` being ignored with `DIFFERENTIAL` agree with current Microsoft documentation.
- The metadata relationships are correct: for a single-based differential, `DifferentialBaseLSN` matches the base backup's `FirstLSN`, and the differential's `DifferentialBaseGUID` identifies the base backup represented by `BackupSetGUID` on media or `backup_set_uuid` in `msdb`.
- The multibased differential caveat and the direction to inspect file-level metadata are correct. The documented file-level fields are exposed by `RESTORE FILELISTONLY` and `msdb.dbo.backupfile`.
- The restore paths, logical file names, and `FILE = 1` values are illustrative and must match the actual backup media and destination instance.
- No deprecated Transact-SQL syntax or broken documentation links were found.
