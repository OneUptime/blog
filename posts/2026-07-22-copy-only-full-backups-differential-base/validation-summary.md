# Validation Summary: Copy-Only Full Backups and Differential Bases: What DBAs Need to Know

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Microsoft SQL Server
- Transact-SQL (`BACKUP DATABASE`, `BACKUP LOG`, and `RESTORE HEADERONLY`)
- Copy-only full and transaction log backups
- Differential backups and differential base metadata
- `msdb` backup history tables
- Transparent Data Encryption (TDE) recovery dependencies

## Sources Consulted

- [Copy-Only Backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Differential Backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [BACKUP (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17)
- [Create a Full Database Backup (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-full-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE HEADERONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY (Transact-SQL)](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [`backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [`backupfile` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupfile-transact-sql?view=sql-server-ver17)
- [Move a TDE-protected database to another SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/move-a-tde-protected-database-to-another-sql-server?view=sql-server-ver17)

## Issues Found

- The operational guidance said to record backup-set-level `DifferentialBaseLSN` and GUID values for every differential. Microsoft documents that these fields are `NULL` for multibased differentials. The guidance now distinguishes single-based differentials and directs readers to per-file metadata from `RESTORE FILELISTONLY` or `msdb.dbo.backupfile` for multibased differentials.

## Review Notes

- The copy-only full and copy-only log behavior is accurately described, including differential-base preservation, log archive-point preservation, and the lack of log truncation after a copy-only log backup.
- Both backup commands and the metadata query use valid, current Transact-SQL syntax. The destination directories must already exist, and the SQL Server service account must have permission to write there; these are environment prerequisites rather than defects in the examples.
- `COMPRESSION` availability and behavior can vary by SQL Server version and edition, but the option is valid for currently supported SQL Server releases covered by the linked documentation.
