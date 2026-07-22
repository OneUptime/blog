# Validation Summary: How to Verify a Differential Backup’s Base LSN with RESTORE HEADERONLY

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (`RESTORE HEADERONLY`, `RESTORE FILELISTONLY`, `RESTORE DATABASE`, and `RESTORE VERIFYONLY`)
- SQL Server full, differential, file, partial, striped, encrypted, and transaction log backups
- SQL Server `msdb` backup-history tables
- Log sequence numbers (LSNs) and backup-set GUIDs
- Transparent Data Encryption (TDE) and Extensible Key Management (EKM)
- JavaScript and spreadsheet numeric precision

## Sources Consulted

- [RESTORE HEADERONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [RESTORE VERIFYONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17)
- [RESTORE arguments (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Restore a differential database backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [Copy-only backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [backupset (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [backupfile (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [backupmediafamily (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupmediafamily-transact-sql?view=sql-server-ver17)
- [Media sets, media families, and backup sets (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/media-sets-media-families-and-backup-sets-sql-server?view=sql-server-ver17)
- [Restore a database to a new location (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-database-to-a-new-location-sql-server?view=sql-server-ver17)
- [Transparent data encryption (TDE)](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption?view=sql-server-ver17)
- [Move a TDE-protected database to another SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/move-a-tde-protected-database-to-another-sql-server?view=sql-server-ver17)
- [Enable TDE on SQL Server using EKM](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/enable-tde-on-sql-server-using-ekm?view=sql-server-ver17)
- [Number.MAX_SAFE_INTEGER (MDN Web Docs)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)
- [Excel specifications and limits](https://support.microsoft.com/en-US/Excel/excel-specifications-and-limits)

## Issues Found

- The TDE prerequisite ambiguously associated the private key with the asymmetric-key case and could be read as requiring only a certificate file for certificate-based TDE. It now states that the target must have the certificate and its private key, or the EKM-backed asymmetric key, available in `master` before the restore.
- The `RESTORE VERIFYONLY` description implied that checksum validation always occurs. It now reflects Microsoft's documented behavior: the command checks that the backup set is complete and all volumes are readable, and verifies checksums when they are present on the media.

## Review Notes

- The documented single-based relationship is correct: the differential's `DifferentialBaseLSN` equals the base backup's `FirstLSN`, while `DifferentialBaseGUID` identifies the base backup set and corresponds to its `BackupSetGUID`/`backup_set_uuid`.
- The T-SQL examples are syntactically valid. The `WITH FILE = 1` values and logical file names in the restore example are illustrative and must match the `Position` and `LogicalName` values read from the actual media.
- The multi-based differential guidance is correct: database-level base fields are null and the base must be determined per file with `RESTORE FILELISTONLY` or `msdb.dbo.backupfile`.
- Copy-only full backups do not establish or change a differential base, and all media families are required for a striped disk restore.
- No deprecated APIs or version-specific inaccuracies were found for the linked SQL Server version 17 documentation.
