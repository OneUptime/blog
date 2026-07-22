# Add Log Backups After a SQL Server Differential Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Point-in-Time Recovery, Differential Backup, Transaction Log, Restore

Description: Combine a matching full, a differential, and the subsequent SQL Server log chain to recover safely to a precise time.

---

To recover SQL Server to a point after a differential backup, restore the differential's matching full with `NORECOVERY`, restore the differential with `NORECOVERY`, then restore every required subsequent transaction log in order. Specify the same `STOPAT` value on every log restore; it takes effect on the log backup containing the target. Use `RECOVERY` only when the sequence is complete.

The differential gives you a later data starting point. The transaction log supplies the ordered changes and precise stopping capability.

## Preconditions

Point-in-time recovery requires a database using the full recovery model, or the bulk-logged model with restrictions around minimally logged operations. The log chain must have been established and remain unbroken. You need:

- the exact full backup that is the differential base;
- a valid differential whose endpoint is earlier than the target time;
- all log backups required after the differential's recovery point through the target;
- a tail-log backup when the source state permits and recovering the final interval matters;
- the TDE certificate and matching private key, or other required encryption protector;
- enough destination space and a supported SQL Server version.

Microsoft notes that a point-in-time target is always interpreted as a point in a log backup. Data backups establish the restore starting point; log records roll the database forward.

## Inspect the Chain First

Do not rely on filename timestamps. Read headers:

```sql
RESTORE HEADERONLY FROM DISK = 'E:\Restore\Sales_full.bak';
RESTORE HEADERONLY FROM DISK = 'E:\Restore\Sales_diff.bak';
RESTORE HEADERONLY FROM DISK = 'E:\Restore\Sales_log_001.trn';
```

Confirm the full/differential base relationship. For the logs, confirm overlapping, continuous `FirstLSN` and `LastLSN` ranges that cover the target. A log backup can span the time recorded in its filename, and server clocks can complicate timestamp reasoning. Let SQL Server validate the LSN sequence.

Choose the latest valid differential whose endpoint is earlier than the desired point. A differential that is too recent has already incorporated a later database state and cannot be used to roll backward.

## Restore Full and Differential Without Recovery

```sql
RESTORE DATABASE Sales_PITR
FROM DISK = 'E:\Restore\Sales_full.bak'
WITH FILE = 1,
     MOVE 'Sales_Data' TO 'F:\SQLData\Sales_PITR.mdf',
     MOVE 'Sales_Log'  TO 'G:\SQLLog\Sales_PITR.ldf',
     NORECOVERY, STATS = 10;

RESTORE DATABASE Sales_PITR
FROM DISK = 'E:\Restore\Sales_diff.bak'
WITH FILE = 1, NORECOVERY, STATS = 10;
```

The target stays in `RESTORING`. If either statement uses `RECOVERY`, SQL Server rolls back incomplete transactions and brings the database online; you must restart from the full before applying more backups.

## Apply Logs in Order

Restore every required log before the one containing the target, repeating the identical `STOPAT` value on each statement:

```sql
RESTORE LOG Sales_PITR
FROM DISK = 'E:\Restore\Sales_log_001.trn'
WITH FILE = 1,
     STOPAT = '2026-07-22T14:37:00',
     NORECOVERY;

RESTORE LOG Sales_PITR
FROM DISK = 'E:\Restore\Sales_log_002.trn'
WITH FILE = 1,
     STOPAT = '2026-07-22T14:37:00',
     NORECOVERY;
```

Then stop inside the applicable log backup:

```sql
RESTORE LOG Sales_PITR
FROM DISK = 'E:\Restore\Sales_log_003.trn'
WITH FILE = 1,
     STOPAT = '2026-07-22T14:37:00',
     RECOVERY;
```

Use an unambiguous ISO-style time and confirm how the target maps to the database server's recorded time. The restore stops before the first transaction whose commit time is after the specified time. Long-running transactions and application-visible effects mean the business state should be validated, not inferred only from wall-clock time.

Microsoft recommends restoring all logs with `NORECOVERY`, then recovering in a separate `RESTORE DATABASE ... WITH RECOVERY` operation after the final log. That pattern makes the boundary explicit and reduces accidental early recovery:

```sql
RESTORE LOG Sales_PITR
FROM DISK = 'E:\Restore\Sales_log_003.trn'
WITH STOPAT = '2026-07-22T14:37:00', NORECOVERY;

RESTORE DATABASE Sales_PITR WITH RECOVERY;
```

## Understand Which Logs Are Required

A full database backup contains enough log for its own transactional consistency, but it does not replace the later log backups. A differential also includes enough log for its own consistency; it does not contain the entire log sequence since the full as restorable log backup members.

The first log you apply after a differential must contain the LSN needed to continue from the database state established by that differential. You might not need every log since the full when a later differential is used, but you do need every required log from the chosen starting state onward. Let SQL Server's LSN checks determine applicability rather than deleting earlier logs based on dates.

A newer full backup generally does not break the log chain. Log backups can span full backups. The restore plan may choose a later full or differential to reduce work while preserving the same continuous log history.

## Bulk-Logged Restrictions

Under the bulk-logged recovery model, qualifying bulk operations can be minimally logged. The corresponding log backup includes changed extents needed for recovery. If a log backup contains bulk-logged changes, SQL Server cannot stop at an arbitrary point inside that backup; the whole backup must be restored. Plan recovery-model changes and bulk windows around the stated point-in-time objective.

Do not switch casually to simple recovery to control log growth. That breaks the log backup chain. Diagnose `log_reuse_wait_desc`, keep log backups healthy, and size the log for the workload.

## Validate and Preserve the Source

Restore to a separate name when possible. Run `DBCC CHECKDB`, verify the target transaction or business event, and have application owners test critical invariants. A technically valid 14:37 restore may be the wrong business boundary if a multi-step workflow was half complete.

Keep the original backup objects immutable until validation and cutover succeed. Record the exact backup set positions, hashes, LSNs, target time, restore commands, elapsed time, and validation result. This turns the real incident into an auditable recovery and improves the next drill.

## Official Documentation

- [Restore a SQL Server database to a point in time](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Apply SQL Server transaction log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [Restore a transaction log backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-transaction-log-backup-sql-server?view=sql-server-ver17)
- [Tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Recovery models](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17)
