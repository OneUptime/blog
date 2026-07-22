# Validation Summary: Do You Need Every Differential Backup to Restore a Database?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Microsoft SQL Server backup and restore
- Full and differential database backups
- Transaction log backups and point-in-time recovery
- Transact-SQL `RESTORE` statements
- Backup metadata from `RESTORE HEADERONLY` and `RESTORE FILELISTONLY`
- Tail-log backups, backup checksums, and encrypted backups
- `DBCC CHECKDB`

## Sources Consulted

- [Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Restore a differential database backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE arguments (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [Enable or disable backup checksums during backup or restore (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/enable-or-disable-backup-checksums-during-backup-or-restore-sql-server?view=sql-server-ver17)
- [RESTORE HEADERONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Apply transaction log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [Transaction log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/transaction-log-backups-sql-server?view=sql-server-ver17)
- [Restore a SQL Server database to a point in time (full recovery model)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Complete database restores (full recovery model)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/complete-database-restores-full-recovery-model?view=sql-server-ver17)
- [Copy-only backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Tail-log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Media sets, media families, and backup sets (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/media-sets-media-families-and-backup-sets-sql-server?view=sql-server-ver17)
- [Backup encryption (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-encryption?view=sql-server-ver17)
- [DBCC CHECKDB (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17)

## Issues Found

- The restore example specified `WITH CHECKSUM` without establishing that the backups were created with backup checksums. SQL Server fails a restore with explicit `CHECKSUM` when the backup has no backup checksums. Removed the explicit option; the default behavior still verifies backup checksums when present and proceeds when they are absent.
- The point-in-time sequence put `STOPAT` only on the final log restore. Microsoft documents that the identical `STOPAT` target must be supplied on every `RESTORE LOG` statement in the sequence. Updated the sequence accordingly while retaining `NORECOVERY` for intermediate logs and `RECOVERY` for the target-containing log.
- The post described the conventional restore as a “two-file rule” and titled a table “Minimum Files.” A full or differential backup set can span multiple media families, so two backup sets do not always mean two physical files. Changed the terminology to “two-backup-set rule” and “Minimum Backup Sets.”
- The post categorized encryption keys, credentials, and backup catalog data as unconditional operational dependencies. Clarified that keys or certificates and storage credentials are conditional on backup protection and storage, while catalog data aids discovery but is not required as a restore-sequence member.

## Review Notes

- The central claim is correct: SQL Server differential database backups are cumulative from their matching differential base, so restoring a chosen differential does not require earlier differentials from the same series.
- The Transact-SQL shown uses current, supported syntax. The short restore example assumes each named media file contains the intended backup set at the default position and that the original database-file paths are usable; the post correctly calls for explicit `FILE` positions and `MOVE` in the fuller test exercise.
- The point-in-time discussion is explicitly scoped to the full recovery model. Under the bulk-logged model, point-in-time recovery is not possible within a log backup that contains bulk-logged changes.
