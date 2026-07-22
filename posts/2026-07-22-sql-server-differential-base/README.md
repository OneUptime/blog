# What Is the Differential Base, and Which Full Backup Does SQL Server Use?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Differential Backup, Differential Base, LSN, Backup Restore

Description: Identify the exact full backup that a SQL Server differential depends on by using copy-only rules, backup headers, LSNs, GUIDs, and restore tests.

---

The differential base is the data backup whose state a SQL Server differential uses as its starting point. For a conventional database differential, it is normally the most recent successful non-copy-only full database backup that can act as a base—not whichever `.bak` file has the most convenient timestamp or filename.

You must restore that base before its differential. Restoring a different full, even one that looks older or newer for the same database, causes the differential restore to fail or produces an invalid recovery plan.

## How a Base Is Selected

A regular full database backup becomes the base for subsequent database differential backups. Each differential captures extents changed from that base, so differentials in one series are cumulative:

```text
F1 regular full
  |- D1 differential based on F1
  |- D2 differential based on F1

F2 regular full
  |- D3 differential based on F2
```

`D2` does not depend on `D1`. Restore `F1` and then `D2`. After `F2` establishes a new base, `D3` belongs with `F2`, not `F1`.

Copy-only full backups intentionally stay outside this selection:

```sql
BACKUP DATABASE Sales
TO DISK = 'E:\SQLBackups\Sales_ad_hoc_copy.bak'
WITH COPY_ONLY, CHECKSUM, COMPRESSION;
```

Microsoft documents that a copy-only full cannot serve as a differential base and does not affect the current base. It is therefore the right native option for an ad hoc full backup that should not redirect scheduled differentials. `COPY_ONLY` has no effect when combined with `DIFFERENTIAL`.

## Use Metadata, Not Names

Inspect a backup file before constructing a restore sequence:

```sql
RESTORE HEADERONLY
FROM DISK = 'E:\SQLBackups\Sales_diff_20260722.bak';
```

Important columns include:

- `BackupType` and `BackupTypeDescription` identify the backup kind; database differential is type 5;
- `DatabaseName` and `DatabaseCreationDate` help distinguish database identities;
- `Position` is the backup set number used by `WITH FILE` when media contains multiple sets;
- `FirstLSN`, `LastLSN`, and `CheckpointLSN` describe log positions associated with the set;
- `DatabaseBackupLSN` identifies the most recent full database backup context;
- `DifferentialBaseLSN` is the base LSN for a single-based differential;
- `DifferentialBaseGUID` identifies that base on the differential row;
- `BackupSetGUID` identifies each backup set, including the candidate full;
- `IsCopyOnly` shows whether a backup is copy-only.

For a single-based differential, Microsoft specifies that `DifferentialBaseLSN` equals the `FirstLSN` of the differential base. The differential's `DifferentialBaseGUID` must match the candidate full's `BackupSetGUID`; these are differently named columns, not two `DifferentialBaseGUID` values. Match both relationships exactly. Do not compare numeric LSNs after converting them to floating-point values; preserve their full precision.

A multi-based differential can arise with file or partial backup strategies. Its database-level base LSN and GUID can be null because each file may have its own base. Inspect `RESTORE FILELISTONLY` and design the file restore sequence explicitly rather than applying database-backup shortcuts.

## Query Backup History

When `msdb` history is available, find candidate relationships with `dbo.backupset`:

```sql
SELECT
    backup_set_id,
    database_name,
    type,
    backup_start_date,
    backup_finish_date,
    first_lsn,
    backup_set_uuid,
    database_backup_lsn,
    differential_base_lsn,
    differential_base_guid,
    is_copy_only
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
ORDER BY backup_finish_date DESC;
```

In `msdb`, match the differential row's `differential_base_guid` to the full row's `backup_set_uuid`, alongside the LSN and database-identity checks.

For disaster recovery, `msdb` on the failed server may be unavailable or its history may have been purged. Persist backup inventory externally and keep it synchronized with immutable object names, hashes, encryption-key identifiers, storage locations, retention, and restore-test results. `RESTORE HEADERONLY` remains useful because it reads metadata from the backup media itself.

## The Ad Hoc Full Backup Trap

Suppose operations takes a normal full on Wednesday for a migration. Thursday's scheduled differential may now use Wednesday as its base, while the backup system expects Sunday's scheduled full. If the ad hoc file is discarded after the migration, Thursday's differential is not recoverable from Sunday.

Prevent this in two ways:

1. Use `WITH COPY_ONLY` for full backups that must not alter the differential base.
2. Make the scheduled backup system discover and retain the actual base recorded in metadata instead of assuming ownership of every backup operation.

Be especially careful with third-party tools and VSS integrations. Determine whether they create a native full, a copy-only full, or a storage snapshot coordinated through SQL Server. Verify behavior in the backup header and in a lab; product labels alone are not enough.

## Restore the Matching Pair

A basic restore keeps the database unrecovered between the base and differential:

```sql
RESTORE DATABASE Sales_RestoreTest
FROM DISK = 'E:\Restore\Sales_full_base.bak'
WITH FILE = 1,
     MOVE 'Sales_Data' TO 'F:\SQLData\Sales_RestoreTest.mdf',
     MOVE 'Sales_Log'  TO 'G:\SQLLog\Sales_RestoreTest.ldf',
     NORECOVERY, CHECKSUM;

RESTORE DATABASE Sales_RestoreTest
FROM DISK = 'E:\Restore\Sales_diff.bak'
WITH FILE = 1, RECOVERY, CHECKSUM;
```

If transaction log backups follow, leave the differential in `NORECOVERY`, restore every required log in order, and use `RECOVERY` only on the last step. A tail-log backup may be required before overwriting a damaged but accessible source database.

Before the real restore, use `RESTORE VERIFYONLY` as one check, but do not call it a restore test. It verifies that the backup set is complete and readable according to its checks; it does not run database recovery, `DBCC CHECKDB`, or application validation.

## Diagnose a Base Mismatch

When SQL Server reports that a differential cannot be restored because the database has not been restored to the correct earlier state:

- leave the target in `RESTORING` while investigating;
- read the differential header and record its base LSN and GUID;
- inventory every available full, including multi-set media;
- find the exact matching non-copy-only base;
- restart the restore sequence from that full;
- if the base is gone, select an older complete recovery chain or another recovery method.

Repeatedly trying full backups by date wastes incident time and can accidentally recover the database too early. Generate restore scripts from verified metadata before an outage and rehearse them regularly.

## Official Documentation

- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Restore a differential database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-differential-database-backup-sql-server?view=sql-server-ver17)
