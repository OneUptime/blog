# Validation Summary: How to Choose Full and Differential Backup Schedules from Your RPO and RTO

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft SQL Server
- Full, differential, and transaction log backups
- Simple and full recovery models
- Point-in-time restore and tail-log backup
- Transparent Data Encryption (TDE)
- `msdb.dbo.backupset`
- `DBCC CHECKDB`
- Resource Governor and backup compression
- Recovery point objectives (RPO) and recovery time objectives (RTO)

## Sources Consulted
- [Back up and restore of SQL Server databases](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-and-restore-of-sql-server-databases?view=sql-server-ver17)
- [Differential backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Transaction log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/transaction-log-backups-sql-server?view=sql-server-ver17)
- [Tail-log backups (SQL Server)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Restore a SQL Server database to a point in time (Full Recovery Model)](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [`backupset` (Transact-SQL)](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Transparent Data Encryption (TDE)](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption?view=sql-server-ver17)
- [Use Resource Governor to limit CPU usage by backup compression](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/use-resource-governor-to-limit-cpu-usage-by-backup-compression-transact-sql?view=sql-server-ver17)

## Issues Found
- The recovery workflow mentioned obtaining TDE certificates but omitted their associated private keys. Updated the text because restoring a TDE-protected database on another SQL Server instance requires the certificate and its private key.

## Review Notes
- The schedule blocks are illustrative cadence examples rather than executable code, commands, or configuration.
- The guidance correctly treats a differential as cumulative from its non-copy-only full base, preserves the uninterrupted log sequence needed for point-in-time recovery, and avoids relying on a tail-log backup when the log is damaged.
- The Resource Governor statement is accurate for SQL Server sessions classified into a workload group; any CPU limit can extend backup duration and must be tested against the backup window.
