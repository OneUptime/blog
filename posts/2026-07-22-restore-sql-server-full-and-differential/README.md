# Restore SQL Server Full and Differential Backups in the Correct Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Restore, Full Backup, Differential Backup, Disaster Recovery

Description: Restore a matching SQL Server full and differential backup safely with metadata checks, NORECOVERY, file relocation, and post-recovery validation.

---

Restore the matching full backup first with `NORECOVERY`, then restore the chosen differential with `RECOVERY`-or keep using `NORECOVERY` if transaction log backups still need to be applied. The order is simple, but most failed restores come from selecting the wrong full, recovering too soon, or overlooking files, encryption keys, and backup-set positions.

This runbook uses T-SQL because it is explicit, reviewable, and easy to automate.

## 1. Protect the Recovery Opportunity

Before overwriting an existing database, decide whether a tail-log backup is possible and required. Under the full or bulk-logged recovery model, the active log can contain transactions newer than the last scheduled log backup.

When the database is damaged but the log is accessible, a tail-log operation can preserve that final interval. The exact command depends on database state; options such as `NORECOVERY`, `NO_TRUNCATE`, and `CONTINUE_AFTER_ERROR` have specific prerequisites and consequences. Follow Microsoft's tail-log procedure rather than copying a generic command into an incident.

Prefer restoring into a separate database or isolated instance first. It preserves the source, exposes file-space and compatibility problems early, and lets users validate data before cutover.

## 2. Inventory Backup Sets

One `.bak` file can contain multiple backup sets. Read the headers of both candidate media:

```sql
RESTORE HEADERONLY
FROM DISK = 'E:\Restore\Sales_full.bak';

RESTORE HEADERONLY
FROM DISK = 'E:\Restore\Sales_diff.bak';
```

Record `Position`, `BackupTypeDescription`, `DatabaseName`, `DatabaseCreationDate`, `FirstLSN`, `CheckpointLSN`, `DatabaseBackupLSN`, `BackupSetGUID`, `DifferentialBaseLSN`, `DifferentialBaseGUID`, `IsCopyOnly`, and `HasBackupChecksums`. For a single-based database differential, its `DatabaseBackupLSN` must match the base full's `CheckpointLSN`; its `DifferentialBaseLSN` and `DifferentialBaseGUID` must match the base full's `FirstLSN` and `BackupSetGUID`, respectively. The base full must not be copy-only. If the header-level differential-base fields are `NULL` for a multibased differential, inspect the per-file `DifferentialBaseLSN` and `DifferentialBaseGUID` values with `RESTORE FILELISTONLY`. Timestamps and filenames are hints, not proof.

Inspect logical files in the selected full backup set:

```sql
RESTORE FILELISTONLY
FROM DISK = 'E:\Restore\Sales_full.bak'
WITH FILE = 1;
```

This produces the logical names needed by `MOVE`. Include every data and log file. Confirm destination disk capacity, permissions for the SQL Server service account, and that paths do not collide with an existing database.

If Transparent Data Encryption protected the source, the destination instance needs the certificate and its private key, or access to the EKM-protected asymmetric key, before restore. The protector must be installed in `master`. A usable `.bak` without access to the TDE protector is not recoverable.

## 3. Restore the Full With `NORECOVERY`

```sql
RESTORE DATABASE Sales_Restore
FROM DISK = 'E:\Restore\Sales_full.bak'
WITH FILE = 1,
     MOVE 'Sales_Data' TO 'F:\SQLData\Sales_Restore.mdf',
     MOVE 'Sales_Log'  TO 'G:\SQLLog\Sales_Restore.ldf',
     NORECOVERY,
     CHECKSUM,
     STATS = 10;
```

`NORECOVERY` performs the restore but leaves the database in the `RESTORING` state so it can accept another backup. This is mandatory before applying the differential.

The examples use `CHECKSUM` because they assume `RESTORE HEADERONLY` reports `HasBackupChecksums = 1`. Explicit `RESTORE ... WITH CHECKSUM` fails when the backup has no backup checksum. For media without one, omit the option and accept that this layer of validation is unavailable; do not use `NO_CHECKSUM` merely to suppress a checksum failure on media that has one. If SQL Server reports an error, investigate rather than making `CONTINUE_AFTER_ERROR` the routine response.

Use `REPLACE` only after verifying the target. It overrides important safeguards and can overwrite a database or restore over files belonging to another database. A safer normal workflow uses a distinct test database and explicit `MOVE` destinations.

## 4. Restore the Differential

If the differential is the last member of the sequence:

```sql
RESTORE DATABASE Sales_Restore
FROM DISK = 'E:\Restore\Sales_diff.bak'
WITH FILE = 1,
     RECOVERY,
     CHECKSUM,
     STATS = 10;
```

`RECOVERY` rolls back uncommitted transactions and brings the database online. Once this happens, additional differentials or log backups cannot be applied to that restore sequence.

If you will apply log backups, use:

```sql
RESTORE DATABASE Sales_Restore
FROM DISK = 'E:\Restore\Sales_diff.bak'
WITH FILE = 1, NORECOVERY, CHECKSUM, STATS = 10;
```

Then restore every required log after the differential in LSN order. Use `RECOVERY` on the final log restore, optionally with an appropriate `STOPAT` target.

You need only the chosen differential, not every differential since the full. Each database differential is cumulative from its base.

## 5. Validate Before Cutover

A database reaching `ONLINE` is necessary, not sufficient. Perform validation appropriate to the incident:

```sql
SELECT name, state_desc, recovery_model_desc
FROM sys.databases
WHERE name = N'Sales_Restore';

DBCC CHECKDB (N'Sales_Restore') WITH NO_INFOMSGS;
```

Also verify:

- the newest expected business transaction and recovery timestamp;
- critical table counts and invariants;
- application login mappings, contained users, jobs, linked servers, and credentials;
- TDE and other encryption dependencies;
- Service Broker, change-data-capture, replication, and availability-group implications;
- database compatibility level and server-version support;
- application read/write behavior in an isolated validation session.

Backups created by a newer SQL Server version cannot be restored to an older version. Restoring user databases does not automatically recreate instance-scoped objects such as logins and SQL Agent jobs.

## Troubleshoot Common Failures

**“The differential backup cannot be restored.”** The target was not restored from the differential's actual base, or it was recovered. Match the differential's `DifferentialBaseGUID` to the full's `BackupSetGUID` and its `DatabaseBackupLSN` to the full's `CheckpointLSN`, then restart from the correct full with `NORECOVERY`.

**The database is already online.** `RECOVERY` ran too early. Restart the sequence from the full; an online recovered database cannot accept the remaining backup.

**Operating-system error or file collision.** Recheck service-account access, free space, logical file names, and every `MOVE` path. Do not assume a destination uses the source server's drive layout.

**Backup-set-not-found error.** The media contains multiple sets and `FILE` selects the wrong position. Use `RESTORE HEADERONLY` to find the right `Position`.

**Certificate error.** Restore the TDE protector and private key into `master` on the destination before restoring the database.

**Log restore fails after the differential.** Confirm that the log's LSN range follows the restored data state and that no log member is missing. The selected differential can let you begin later in the same log chain, but it cannot repair a gap after its recovery point.

## Automate the Runbook

Store a machine-readable inventory beside backup objects. Generate restore commands from header metadata, but require a reviewed target database and explicit file mappings. In a recurring restore drill, measure staging, download, restore, recovery, integrity check, business validation, and cutover separately.

`RESTORE VERIFYONLY` is useful for detecting some media and backup-set problems without restoring. It does not replace a real restore, database recovery, `DBCC CHECKDB`, or application verification. The trustworthy backup chain is the one your team has restored under realistic conditions.

## Official Documentation

- [Restore a differential SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE statements reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17)
- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Tail-log backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/tail-log-backups-sql-server?view=sql-server-ver17)
- [Move a TDE-protected database](https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/move-a-tde-protected-database-to-another-sql-server?view=sql-server-ver17)
