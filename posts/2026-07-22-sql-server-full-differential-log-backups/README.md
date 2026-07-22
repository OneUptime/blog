# SQL Server Full, Differential, and Transaction Log Backups Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Backup, Differential Backup, Transaction Log, Point-in-Time Recovery

Description: Understand what SQL Server full, differential, and log backups contain, how their restore chains relate, and where recovery models change the plan.

---

SQL Server's three common backup types solve different recovery problems. A full database backup supplies a complete data baseline. A differential database backup supplies the extents changed since its base full backup. A transaction log backup supplies an ordered segment of log records for roll-forward and point-in-time recovery.

They are complementary. A differential is not a substitute for log backups, and taking a full backup does not normally break the log chain. A sound plan starts from the required recovery point and works backward to the backup set needed to reach it.

## Full Database Backups

A full database backup includes all data in the database and enough transaction log to recover the included data to a consistent state. It does not mean the database was frozen for the duration of the backup. SQL Server can back up an online database while changes continue, and the included log supports consistency when the backup is restored.

Create one with:

```sql
BACKUP DATABASE Sales
TO DISK = 'E:\SQLBackups\Sales_full_20260722.bak'
WITH CHECKSUM, COMPRESSION, INIT, STATS = 10;
```

`CHECKSUM` asks the backup operation to verify page checksums where present and calculate a backup checksum. `COMPRESSION` can reduce output and I/O at the cost of CPU. `INIT` overwrites backup sets on the named media; use a unique destination and retention controls so it cannot destroy a needed chain.

A normal full database backup becomes the differential base for later database differentials. A `COPY_ONLY` full can be restored normally but does not become a differential base and does not disturb the existing base.

## Differential Database Backups

A differential database backup records the data extents changed since the relevant full backup. It is cumulative, not chained through the previous differential.

```sql
BACKUP DATABASE Sales
TO DISK = 'E:\SQLBackups\Sales_diff_20260722_1800.bak'
WITH DIFFERENTIAL, CHECKSUM, COMPRESSION, INIT, STATS = 10;
```

If Sunday is the base, Thursday's differential already includes the relevant Monday-through-Thursday changes. Restoring Thursday requires Sunday's matching full and Thursday's differential; the Monday, Tuesday, and Wednesday differentials are unnecessary.

Differentials work under the simple, full, and bulk-logged recovery models. They improve recovery time when a large number of log backups would otherwise need to be restored, but they cannot select a moment between backup completions.

## Transaction Log Backups

Log backups capture log records not backed up by the preceding log backup and maintain the log chain. They are available under the full and bulk-logged recovery models, not the simple recovery model.

```sql
BACKUP LOG Sales
TO DISK = 'E:\SQLBackups\Sales_log_20260722_1815.trn'
WITH CHECKSUM, COMPRESSION, INIT, STATS = 10;
```

The log backup interval largely determines the routine RPO. A log every 15 minutes means as much as roughly 15 minutes of committed work can be missing if the active log cannot be backed up after a failure. A tail-log backup, when possible, can capture work since the last scheduled log backup.

Log backups also allow `STOPAT` recovery. Restoring to 18:07 does not mean finding a data backup taken at 18:07. It means restoring a suitable full, optionally a matching differential, and the uninterrupted log sequence that covers the target time.

## Recovery Models Set the Rules

The recovery model controls transaction log maintenance and what recovery sequences are possible:

- **Simple** automatically reuses log space after checkpoints when possible. It does not support log backups or arbitrary point-in-time recovery. Use full and optionally differential backups.
- **Full** supports log backups and point-in-time recovery after the log chain is established. Regular log backups are required both for recoverability and to permit inactive log space to be reused.
- **Bulk-logged** is a special-purpose variation that can minimize logging for qualifying bulk operations. A log backup containing bulk changes can be larger, and point-in-time restore is restricted if the target falls inside such a backup.

Changing from simple to full does not immediately create a usable log backup chain. Microsoft instructs you to take a full or differential database backup after the switch to start the chain, then begin scheduled log backups. Changing from full or bulk-logged to simple breaks the log backup chain.

## Build the Restore Sequence

For a full-recovery database with a weekly full, daily differential, and frequent logs, a typical sequence is:

```sql
RESTORE DATABASE Sales
FROM DISK = 'E:\Restore\Sales_full_20260719.bak'
WITH NORECOVERY, CHECKSUM;

RESTORE DATABASE Sales
FROM DISK = 'E:\Restore\Sales_diff_20260722_0000.bak'
WITH NORECOVERY, CHECKSUM;

RESTORE LOG Sales
FROM DISK = 'E:\Restore\Sales_log_20260722_0015.trn'
WITH NORECOVERY, CHECKSUM;

-- Repeat every required log in LSN order.
RESTORE LOG Sales
FROM DISK = 'E:\Restore\Sales_log_20260722_1815.trn'
WITH STOPAT = '2026-07-22T18:07:00', RECOVERY, CHECKSUM;
```

Use `NORECOVERY` until the final member so SQL Server leaves the database ready to accept the next restore. Once `RECOVERY` runs, the database is brought online and later logs cannot be appended to that restore sequence.

The differential must match the full base. Filename dates are not enough. Inspect `RESTORE HEADERONLY` or `msdb.dbo.backupset` and compare the backup type, database identity, checkpoint and database backup LSNs, differential base LSN/GUID, first and last LSNs, and copy-only flag.

## Common Misconceptions

**A full backup truncates the transaction log.** It does not. Under full recovery, log backups are what normally enable reusable log space once other reuse blockers are cleared.

**Every differential is needed.** Only the selected differential and its matching base are required. Older differentials may be retained as alternative recovery points.

**A differential contains the log since the full.** It contains changed data extents plus enough log for its own consistency. It does not preserve the ordered log chain needed for arbitrary point-in-time recovery.

**A successful backup proves recovery.** It proves that one backup operation completed. Use checksums, retain metadata and keys, restore into an isolated environment, run `DBCC CHECKDB`, and perform application-level checks.

## A Practical Cadence

Choose frequency from RPO and measured restore time, not a universal schedule. One starting point for an important OLTP database is a weekly full, daily differential, and log backups every 5–15 minutes. Adjust when differentials approach full-backup size, restore drills exceed RTO, log generation spikes, or storage and network constraints change.

Monitor the last successful backup of each required type, backup duration and size, recovery model, `log_reuse_wait_desc`, chain continuity, failed checksum operations, repository immutability, and restore-test age. Keep backup payloads, metadata, certificates, credentials, and runbooks outside the database server's failure domain.

## Official Documentation

- [Microsoft SQL Server backup overview](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17)
- [Create a full SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-full-database-backup-sql-server?view=sql-server-ver17)
- [Create a differential SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [Back up a SQL Server transaction log](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-a-transaction-log-sql-server?view=sql-server-ver17)
- [View or change the SQL Server recovery model](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/view-or-change-the-recovery-model-of-a-database-sql-server?view=sql-server-ver17)
- [Apply SQL Server transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
