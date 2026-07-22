# Validation Summary: How VSS and Third-Party Backup Tools Can Change Your Differential Base

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server backup and restore
- Volume Shadow Copy Service (VSS)
- SQL Server VSS Writer
- Third-party and snapshot-based backup tools
- SQL Server full, differential, copy-only, and transaction log backups
- Transact-SQL and `msdb.dbo.backupset`
- Always On availability groups
- Transparent Data Encryption (TDE) and backup encryption

## Sources Consulted

- [SQL Server backup applications - Volume Shadow Copy Service (VSS) and SQL Writer](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/sql-server-vss-writer-backup-guide?view=sql-server-ver17)
- [SQL Server VSS Writer logging](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/sql-server-vss-writer-logging?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [`backupset` system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [`backupfile` system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [`RESTORE HEADERONLY`](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [Create a Transact-SQL snapshot backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-transact-sql-snapshot-backup?view=sql-server-ver17)
- [The transaction log](https://learn.microsoft.com/en-us/sql/relational-databases/logs/the-transaction-log-sql-server?view=sql-server-ver17)

## Issues Found

No technical issues found.

## Review Notes

- Microsoft documents that a SQL Writer full backup becomes eligible as a differential base only after the requester sends the Backup Complete event; the post's qualification that behavior depends on the requested operation and implementation is accurate.
- A VSS copy-only operation through SQL Writer does not update SQL Server backup history. The post correctly relies on the subsequent differential's base metadata and the vendor workflow rather than assuming that every tested operation must appear as a row in `msdb`.
- The query is correct for the single-based database differentials described. For multibased differential scenarios, `backupset.differential_base_lsn` and `differential_base_guid` can be `NULL`, requiring file-level inspection through `backupfile` or `RESTORE FILELISTONLY`.
- No deprecated APIs, version-specific errors, invalid URLs, or incorrect commands were found.
