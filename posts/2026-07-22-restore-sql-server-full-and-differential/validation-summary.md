# Validation Summary: Restore SQL Server Full and Differential Backups in the Correct Order

## Status
validated

## Post Type
Technical tutorial and disaster-recovery runbook

## Technologies Covered

- Microsoft SQL Server backup and restore
- Transact-SQL (`RESTORE`, `RESTORE HEADERONLY`, and `RESTORE FILELISTONLY`)
- Full, differential, tail-log, and transaction-log backups
- Backup checksums and `RESTORE VERIFYONLY`
- Transparent Data Encryption (TDE) and Extensible Key Management (EKM)
- `DBCC CHECKDB`

## Sources Consulted

- [Restore a differential database backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE statements (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE statements - Arguments (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Apply transaction log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [Plan and perform restore sequences (full recovery model)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/plan-and-perform-restore-sequences-full-recovery-model?view=sql-server-ver17)
- [Tail-log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Move a TDE-protected database to another SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/move-a-tde-protected-database-to-another-sql-server?view=sql-server-ver17)
- [RESTORE VERIFYONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17)
- [backupset (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Copy-only backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Manage metadata when making a database available on another server](https://learn.microsoft.com/en-us/sql/relational-databases/databases/manage-metadata-when-making-a-database-available-on-another-server?view=sql-server-ver17)
- [DBCC CHECKDB (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)

## Issues Found

- The backup inventory omitted `CheckpointLSN` and `BackupSetGUID`, so it did not provide the full-backup fields needed to validate the differential's base. Added both fields; documented the `DatabaseBackupLSN`/`CheckpointLSN`, `DifferentialBaseLSN`/`FirstLSN`, and `DifferentialBaseGUID`/`BackupSetGUID` relationships; and added the documented per-file check for multibased differentials whose header-level base fields are `NULL`.
- The post recorded `IsCopyOnly` without explaining its consequence. Clarified that a copy-only full backup cannot serve as a differential base.
- The TDE prerequisite treated certificate-based and EKM-based protectors as though both were restored from a private-key file. Clarified that certificate-based TDE requires the certificate and private key, while EKM-based TDE requires access to the EKM-protected asymmetric key; the protector must be installed in `master` before restore.
- The checksum examples depend on `HasBackupChecksums = 1`, but that field was absent from the inventory list. Added it so operators check both selected backup sets before using explicit `WITH CHECKSUM`.
- The checksum guidance referred to checksum-free backups as "older media," although current backups can also be created without backup checksums. Changed this to "media without one" while retaining the correct behavior of `RESTORE ... WITH CHECKSUM`.

## Review Notes

The T-SQL syntax, restore ordering, `NORECOVERY`/`RECOVERY` behavior, log-restore sequence, tail-log cautions, `REPLACE` warning, version-direction restriction, and post-restore validation guidance are consistent with the current SQL Server documentation. Database differentials are correctly described as cumulative. The example paths, logical file names, and `FILE = 1` positions are illustrative and must be replaced with values obtained from the actual backup media, as the post explains.
