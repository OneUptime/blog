# Validation Summary: How to Restore SQL Server to a Point in Time Without Breaking the Log Chain

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (`BACKUP LOG`, `RESTORE DATABASE`, and `RESTORE LOG`)
- Full and bulk-logged recovery models
- Full, differential, transaction-log, and tail-log backups
- Point-in-time recovery with `STOPAT`
- Backup checksums, backup encryption, and Transparent Data Encryption (TDE)
- SQL Server database consistency validation with `DBCC CHECKDB`

## Sources Consulted

- [Restore a SQL Server database to a point in time (full recovery model)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Plan and perform restore sequences under the full recovery model](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/plan-and-perform-restore-sequences-full-recovery-model?view=sql-server-ver17)
- [Apply transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [RESTORE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE statement arguments](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Backup encryption](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-encryption?view=sql-server-ver17)
- [Transparent Data Encryption](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption?view=sql-server-ver17)

## Issues Found

- The initial restore-sequence description and backup-selection checklist said only that the data/full backup had to be before the target. Clarified that its endpoint must be earlier than the target, because `STOPAT` can stop only within a log backup and a data backup is always restored in full.
- The encryption prerequisite mentioned certificates but omitted asymmetric keys and EKM-backed keys. Updated it to cover the certificate or asymmetric key used for backup encryption or TDE, plus the private-key or EKM access needed on the restore instance.
- The damaged tail-log guidance mentioned `NO_TRUNCATE` but not `CONTINUE_AFTER_ERROR`, and did not distinguish the offline scenario. Corrected the guidance to identify `NO_TRUNCATE` for applicable offline scenarios and `CONTINUE_AFTER_ERROR` for damaged-database scenarios.
- Every restore example specified `CHECKSUM` without explaining that this option fails when a backup set has no backup checksums. Added a qualification based on `HasBackupChecksums`; omitting the option uses SQL Server's default behavior of verifying checksums when present and proceeding when absent.

## Review Notes

- The T-SQL syntax for the tail-log backup, metadata inspection, full and differential restores, ordered log restores with identical `STOPAT` values, separate recovery, and `DBCC CHECKDB` validation matches current SQL Server documentation.
- The example paths, logical file names, backup-set positions, timestamps, and single-device media layout are illustrative and must be replaced with values confirmed from the actual backup metadata. A striped backup must be supplied with its required media families.
- Under bulk-logged recovery, a point inside a log backup containing bulk-logged changes remains unavailable; recovery can proceed only to the end of that log backup.
- The linked Microsoft Learn pages resolve and target the current SQL Server documentation view (`sql-server-ver17`).
