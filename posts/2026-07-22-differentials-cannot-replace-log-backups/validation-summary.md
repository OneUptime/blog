# Validation Summary: Why Differential Backups Cannot Replace Transaction Log Backups

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft SQL Server
- SQL Server full, differential, transaction log, copy-only, and tail-log backups
- Full, bulk-logged, and simple recovery models
- Transact-SQL and the `sys.databases` catalog view
- Point-in-time recovery with `STOPAT`
- Recovery point objectives (RPO) and recovery time objectives (RTO)
- Transparent Data Encryption (TDE) backup dependencies

## Sources Consulted

- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/transaction-log-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server transaction log and factors that delay log truncation](https://learn.microsoft.com/en-us/sql/relational-databases/logs/the-transaction-log-sql-server?view=sql-server-ver17#FactorsThatDelayTruncation)
- [Apply SQL Server transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [SQL Server recovery models](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17)
- [SQL Server restore sequences under the full recovery model](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/plan-and-perform-restore-sequences-full-recovery-model?view=sql-server-ver17)
- [RESTORE arguments, including `STOPAT`](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-arguments-transact-sql?view=sql-server-ver17)
- [SQL Server tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [`sys.databases` Transact-SQL catalog view](https://learn.microsoft.com/en-us/sql/relational-databases/system-catalog-views/sys-databases-transact-sql?view=sql-server-ver17)
- [View or change the SQL Server recovery model](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/view-or-change-the-recovery-model-of-a-database-sql-server?view=sql-server-ver17)

## Issues Found

No technical issues found.

## Review Notes

- The `sys.databases` query is syntactically correct, and both `recovery_model_desc` and `log_reuse_wait_desc` are current catalog-view columns.
- The post correctly states that a differential restore requires its matching full base but not earlier differentials, while log backups must be restored in an unbroken sequence after the selected data backup.
- The point-in-time discussion correctly accounts for bulk-logged recovery constraints: a specific point inside a log backup is unavailable when that backup contains bulk-logged changes.
- The distinction between log truncation and shrinking the physical log file is accurate, as are the warnings about recovery-model changes, copy-only full backups, and tail-log backups.
