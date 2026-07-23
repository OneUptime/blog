# SQL Server Recovery Models Explained: Simple, Full, and Bulk-Logged

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Recovery Model, Transaction Log, Backup, Disaster Recovery

Description: Choose and operate a SQL Server recovery model from recovery-point requirements rather than log-size myths.

---

A SQL Server recovery model controls transaction-log maintenance, whether log backups are available, and which restore operations can be performed. It does not decide whether transactions are durable, and “simple” does not mean that SQL Server stops logging changes.

Choose the model from the required recovery point and operational features, then implement the backups that make that choice real.

## Compare the Three Models

| Recovery model | Log backups | Point-in-time recovery | Typical use |
| --- | --- | --- | --- |
| Simple | Not supported | No; recover to a data backup | Databases where losing changes since the latest full or differential backup is acceptable |
| Full | Required for the intended recovery capability and log reuse | Yes, through an unbroken log chain | Production systems with a low RPO, log shipping, or availability requirements |
| Bulk-logged | Required | Limited when a log backup contains minimally logged operations | Temporary optimization for eligible bulk work when its restore tradeoff is accepted |

All three models use the transaction log for recovery and transaction semantics. Under simple recovery, checkpoints normally make inactive log space reusable. Under full and bulk-logged recovery, log backups normally enable reuse after a checkpoint. In every model, a long-running transaction or another reuse wait can still make the physical log grow.

## Simple Recovery

Simple recovery automatically reclaims inactive log space after checkpoints, subject to anything that delays truncation. It does not support transaction-log backups, so the smallest recovery interval is bounded by data backups.

Suppose a full backup runs Sunday and differential backups run every four hours. If the database is lost at 15:59, the latest recoverable state may be the 12:00 differential; changes after that point are exposed to loss. More frequent data backups can reduce the exposure, but they are not a substitute for log backups when a minutes-level RPO is required.

Simple recovery also cannot support features that depend on a log backup chain, including log shipping and Always On availability groups. It is appropriate only when the stated recovery requirement accepts these limits.

## Full Recovery

Full recovery supports a sequence of full, optional differential, and transaction-log backups. With an intact chain—and a tail-log backup when the failure allows it—you can restore to a specific time or marked transaction.

Setting a database to full does not start a log-backup job. Without regular log backups, the log can continue growing and the promised point-in-time recovery does not exist. The log-backup interval is a major control on normal work-loss exposure: a 15-minute schedule can still lose up to roughly that interval if the active tail cannot be backed up.

Full recovery is required for an availability-group database. It is also the normal choice for log shipping and for business systems whose RPO is shorter than a practical data-backup interval.

## Bulk-Logged Recovery

Bulk-logged recovery is a variation of full recovery. Certain qualifying bulk operations can be minimally logged, reducing log-record volume for those operations. It does not make arbitrary `INSERT`, `UPDATE`, or `DELETE` statements minimally logged, and the exact eligibility depends on the operation, table conditions, and other requirements.

The recovery tradeoff is critical: if a log backup contains minimally logged changes, SQL Server must include the changed data extents in that log backup. The backup can therefore be large, and you cannot restore to an arbitrary point inside that log backup; you restore it through its end. Any data files containing the bulk changes must remain accessible for the log backup to capture them.

Use bulk-logged only for a planned window when:

- the operation is verified to qualify for minimal logging;
- the organization accepts the temporary point-in-time limitation;
- log, backup, storage, and restore capacity have been tested;
- log backups continue throughout the window;
- monitoring proves when the database enters and leaves the model.

Switching between full and bulk-logged does not by itself break the log chain, but backup and restore handling must cover the entire interval.

## Inspect the Current State

```sql
SELECT
    name,
    recovery_model_desc,
    log_reuse_wait_desc
FROM sys.databases
WHERE database_id > 4
ORDER BY name;
```

Review backup history as supporting evidence, not as the only recovery catalog:

```sql
SELECT
    database_name,
    MAX(CASE WHEN type = 'D' THEN backup_finish_date END) AS last_full,
    MAX(CASE WHEN type = 'I' THEN backup_finish_date END) AS last_diff,
    MAX(CASE WHEN type = 'L' THEN backup_finish_date END) AS last_log
FROM msdb.dbo.backupset
GROUP BY database_name
ORDER BY database_name;
```

`msdb` history can be pruned or lost with the instance, so retain backup metadata with the backup objects and prove the sequence through restore tests.

## Change Models Safely

Changing the model is an explicit database operation:

```sql
ALTER DATABASE Sales SET RECOVERY FULL;
```

When moving from simple to full recovery, immediately take a data backup to start the full-recovery log chain, then start and monitor the log-backup schedule:

```sql
BACKUP DATABASE Sales
TO DISK = N'E:\SQLBackups\Sales_full_20260723.bak'
WITH CHECKSUM, COMPRESSION, STATS = 10;

BACKUP LOG Sales
TO DISK = N'E:\SQLBackups\Sales_log_20260723_1430.trn'
WITH CHECKSUM, COMPRESSION, STATS = 10;
```

Paths and media policies are examples. Keep these files together with their encryption keys, retention metadata, and off-host copies.

Moving from full or bulk-logged to simple breaks the log backup chain. If you later return to full, establish a new chain with a data backup. Never switch to simple as an emergency shrink technique; resolve the actual `log_reuse_wait_desc` and preserve the recovery policy.

For a controlled bulk window:

```sql
BACKUP LOG Warehouse
TO DISK = N'E:\SQLBackups\Warehouse_before_bulk.trn'
WITH CHECKSUM, COMPRESSION;
ALTER DATABASE Warehouse SET RECOVERY BULK_LOGGED;
-- Run only the tested, eligible bulk operation.
ALTER DATABASE Warehouse SET RECOVERY FULL;
BACKUP LOG Warehouse
TO DISK = N'E:\SQLBackups\Warehouse_bulk_window.trn'
WITH CHECKSUM, COMPRESSION;
```

The pre-window log backup establishes a clear recovery boundary. The backup taken immediately after returning to full contains the bulk-window changes, so the runbook must identify it and document how it affects point-in-time restore choices.

## Choose from RPO and Restore Tests

Ask four questions:

1. How much committed work can the business lose?
2. Which features require a log chain?
3. How quickly can the selected full, differential, and log sequence be restored?
4. Can operations retain, encrypt, copy, monitor, and routinely test every required backup?

Then run a restore drill to the required recovery point. Recovery model is only one property; the tested chain, accessible keys, healthy media, documented dependencies, and measured RTO determine whether recovery will work.

## Official Documentation

- [Recovery models](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17)
- [View or change the recovery model of a database](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/view-or-change-the-recovery-model-of-a-database-sql-server?view=sql-server-ver17)
- [Back up a transaction log](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-a-transaction-log-sql-server?view=sql-server-ver17)
- [Prerequisites, restrictions, and recommendations for availability groups](https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/prereqs-restrictions-recommendations-always-on-availability?view=sql-server-ver17)
- [Prerequisites for minimal logging in bulk import](https://learn.microsoft.com/en-us/sql/relational-databases/import-export/prerequisites-for-minimal-logging-in-bulk-import?view=sql-server-ver17)
