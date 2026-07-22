# How to Verify a Differential Backup’s Base LSN with RESTORE HEADERONLY

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, RESTORE HEADERONLY, Differential Backup, LSN, Restore Automation

Description: Read SQL Server backup headers and match a differential's base LSN and GUID to the exact full backup before starting a restore.

---

Use `RESTORE HEADERONLY` to read a SQL Server differential's `DifferentialBaseLSN` and `DifferentialBaseGUID`, then find the full backup whose identifying metadata matches that base. This is safer than pairing files by date or name and is essential when multiple tools or ad hoc backups operate on the same database.

For a conventional single-based database differential, Microsoft documents that `DifferentialBaseLSN` equals the `FirstLSN` of the differential base.

## Read the Differential Header

```sql
RESTORE HEADERONLY
FROM DISK = 'E:\Restore\Sales_diff_20260722.bak';
```

If the media contains several backup sets, the result has one row per set. Note the `Position` of the intended database differential. Relevant fields include:

| Column | Why it matters |
| --- | --- |
| `BackupType` | Type 5 is a differential database backup |
| `BackupTypeDescription` | Human-readable confirmation of type |
| `Position` | Backup-set number for `WITH FILE` |
| `DatabaseName` | Source database name |
| `DatabaseCreationDate` | Helps distinguish reused database names |
| `FirstLSN` / `LastLSN` | LSN interval associated with the backup |
| `DatabaseBackupLSN` | Most recent full database backup context |
| `DifferentialBaseLSN` | Base LSN for a single-based differential |
| `DifferentialBaseGUID` | On the differential, identifies its base |
| `BackupSetGUID` | Identifies a backup set, including the candidate full |
| `IsCopyOnly` | Whether the set is copy-only |

Preserve LSNs as exact numeric values or strings. JavaScript and spreadsheet floating-point types can lose precision in large LSN values, causing false matches or mismatches.

## Inspect Candidate Full Backups

Run `RESTORE HEADERONLY` for each candidate full file. Select the row representing a regular full database backup, not a log, file, or copy-only set.

For a single-based differential, match its `DifferentialBaseLSN` to the base full's `FirstLSN` as documented by Microsoft. Also match the differential's `DifferentialBaseGUID` to the full's `BackupSetGUID`. Verify database identity, backup type, SQL Server compatibility, and that the selected media position is correct.

Do not pick the newest full by completion time. A copy-only full may be newer but cannot be a differential base. An unscheduled regular full may have become the base even though the backup system expected an older scheduled full.

## Use `msdb` as a Search Index

When source backup history remains available:

```sql
SELECT
    backup_set_id,
    database_name,
    backup_start_date,
    backup_finish_date,
    type,
    first_lsn,
    backup_set_uuid,
    database_backup_lsn,
    differential_base_lsn,
    differential_base_guid,
    is_copy_only,
    media_set_id
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
ORDER BY backup_finish_date DESC;
```

In `msdb`, the same GUID relationship uses different snake-case names: the differential's `differential_base_guid` must equal the full's `backup_set_uuid`.

Use this to locate candidates, then verify the actual media headers. `msdb` can be purged, restored from a different time, or unavailable during a server loss. A reliable backup catalog exports the dependency metadata and associates it with immutable object locations and hashes.

To locate physical devices for a media set, join `backupset` through `backupmediafamily` as appropriate. Be careful with striped backups: one backup set can span multiple media families, all of which are needed.

## Understand Multi-Based Differentials

The database-level `DifferentialBaseLSN` and GUID are null for a multi-based differential. This can occur with file-level or partial backup strategies where individual files have different bases.

Use:

```sql
RESTORE FILELISTONLY
FROM DISK = 'E:\Restore\Sales_file_diff.bak'
WITH FILE = 1;
```

Inspect file-level `DifferentialBaseLSN` and `DifferentialBaseGUID`. Build the restore plan for each file or filegroup according to the documented online, file, or piecemeal restore sequence. Do not interpret null database-level fields as “no base required.”

## Generate a Safe Restore

After identifying the base:

```sql
RESTORE DATABASE Sales_Test
FROM DISK = 'E:\Restore\Sales_matching_full.bak'
WITH FILE = 1,
     MOVE 'Sales_Data' TO 'F:\SQLData\Sales_Test.mdf',
     MOVE 'Sales_Log'  TO 'G:\SQLLog\Sales_Test.ldf',
     NORECOVERY, CHECKSUM;

RESTORE DATABASE Sales_Test
FROM DISK = 'E:\Restore\Sales_diff_20260722.bak'
WITH FILE = 1, RECOVERY, CHECKSUM;
```

If transaction logs follow, use `NORECOVERY` on the differential and recover only after the last log. If TDE protects the source, restore the certificate or asymmetric key and private key before restoring the database.

`RESTORE VERIFYONLY` can check that the selected backup set is readable and complete according to its metadata and checksums. It does not apply the chain, run recovery, perform `DBCC CHECKDB`, or validate the application. Only a real restore proves that the base and differential work together in the target environment.

## Automate Without Hiding Evidence

A restore planner should print the selected backup-set positions, database identity, base LSN/GUID match, media objects, hashes, encryption-key identifier, and every subsequent log LSN range. Fail closed when a base is ambiguous, absent, or expiring.

Avoid casting LSN values to approximate types, relying on local filenames, or assuming one backup set per file. Keep the generated plan reviewable by an operator. During an incident, explicit metadata is faster than trial-and-error restores.

## Official Documentation

- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [RESTORE FILELISTONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-filelistonly-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [RESTORE VERIFYONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-verifyonly-transact-sql?view=sql-server-ver17)
