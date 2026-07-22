# Validation Summary: Add Log Backups After a SQL Server Differential Restore

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Microsoft SQL Server
- Transact-SQL (`RESTORE DATABASE`, `RESTORE LOG`, and `RESTORE HEADERONLY`)
- Full and bulk-logged recovery models
- Full, differential, transaction-log, and tail-log backups
- Point-in-time recovery using `STOPAT`, `NORECOVERY`, and `RECOVERY`
- Transparent Data Encryption (TDE)

## Sources Consulted
- [Restore a SQL Server database to a point in time (full recovery model)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Apply transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [Restore a transaction log backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-transaction-log-backup-sql-server?view=sql-server-ver17)
- [RESTORE statements (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE arguments (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [Enable or disable backup checksums during backup or restore](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/enable-or-disable-backup-checksums-during-backup-or-restore-sql-server?view=sql-server-ver17)
- [Full database backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/full-database-backups-sql-server?view=sql-server-ver17)
- [Tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Recovery models](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17)
- [SQL Server transaction log architecture and management guide](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-log-architecture-and-management-guide?view=sql-server-ver17)
- [Move a TDE-protected database to another SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/move-a-tde-protected-database-to-another-sql-server?view=sql-server-ver17)

## Issues Found
1. **`STOPAT` was shown only on the final log restore.** Microsoft requires an identical target clause in every `RESTORE LOG` statement in a point-in-time restore sequence. Added the same `STOPAT` value to the earlier log restores and clarified the surrounding instructions.
2. **The restore examples unconditionally specified `CHECKSUM`.** An explicit restore-time `CHECKSUM` causes the restore to fail if the backup set was created without backup checksums. Removed the unconditional options so the examples work with either kind of backup; SQL Server automatically validates backup checksums when they are present.
3. **The differential timing condition allowed an endpoint equal to the target.** Microsoft documents that the data backup's endpoint must be earlier than the target recovery point because data backups are restored in full and cannot be stopped partway through. Changed the prerequisite and selection guidance accordingly.
4. **The first post-differential log's LSN relationship was imprecise.** Replaced “contain an LSN that follows” with the accurate requirement that the log backup contain the LSN needed to continue from the state established by the differential.
5. **The encryption prerequisite mentioned a TDE certificate without its private key.** Clarified that restoring a TDE-protected database on another instance requires the certificate and its matching private key, or the applicable alternative encryption protector.

## Review Notes
- The full/differential/log restore order, use of `NORECOVERY`, separate final recovery pattern, tail-log guidance, corrected TDE protector requirement, and warning that recovery prevents later log restores all match current Microsoft documentation.
- The bulk-logged caveat is accurate: if the relevant log backup contains bulk-logged changes, recovery cannot stop at an arbitrary point inside that backup and must proceed to its end.
- The examples assume that `FILE = 1` is the correct backup-set position and that the logical file names passed to `MOVE` match the selected full backup. The post correctly instructs readers to inspect headers first and record the actual backup-set positions.
- The linked Microsoft Learn pages are live and applicable to current SQL Server documentation (`sql-server-ver17`).
