# How VSS and Third-Party Backup Tools Can Change Your Differential Base

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, VSS, Third-Party Backup, Differential Backup, Copy-Only Backup

Description: Verify whether a VSS or third-party SQL Server backup establishes a new differential base instead of relying on generic full or snapshot labels.

---

A VSS or third-party backup can change the SQL Server differential base if it performs a qualifying regular full backup. If it creates a copy-only full, it does not. Storage snapshots, application-aware jobs, and vendor “full” labels do not all have identical native SQL Server semantics.

The safe approach is to document the product's behavior and verify the resulting SQL Server backup metadata in your exact configuration.

## Why the Distinction Matters

Suppose native jobs retain Sunday's full and daily differentials. On Wednesday, an infrastructure tool takes an application-aware VM backup. Thursday's differential unexpectedly references Wednesday's operation as its base. If the infrastructure snapshot expires before the native differential, the apparent Thursday recovery point is incomplete.

The problem is not that multiple backup tools exist. It is that each tool manages only part of the shared dependency graph.

## Understand the VSS Roles

On Windows, Volume Shadow Copy Service coordinates requesters, writers, and providers. A backup application acts as a requester, the SQL Server VSS Writer participates in application-consistent coordination, and a storage or system provider creates the shadow copy.

The requester selects a backup type and workflow. SQL Server VSS Writer supports backup and restore integration, but the effect on native backup state depends on the requested operation and implementation. A crash-consistent hardware snapshot taken without SQL coordination is not equivalent to an application-consistent SQL Server backup.

Do not infer base behavior solely from the fact that VSS Writer appears in logs.

## Regular Full Versus Copy-Only Full

Native SQL Server semantics are clear:

- a regular full database backup can establish a differential base;
- a copy-only full cannot serve as a differential base and leaves the existing base unchanged;
- a copy-only full restores like another full;
- `COPY_ONLY` has no effect on a differential backup.

Third-party products may expose options such as “copy only,” “do not truncate,” “application aware,” or “snapshot full.” Map those settings to the SQL Server result rather than assuming their names match `BACKUP DATABASE ... WITH COPY_ONLY`.

## Run a Controlled Base Test

Use a nonproduction database with representative files:

1. Take a known regular full `F1`.
2. Modify data and take native differential `D1`.
3. Run the VSS or third-party job under test.
4. Modify data and take native differential `D2`.
5. Query `msdb.dbo.backupset` and inspect backup media headers.
6. Restore `F1 + D2` in isolation.

Query:

```sql
SELECT
    backup_start_date,
    backup_finish_date,
    type,
    user_name,
    first_lsn,
    database_backup_lsn,
    differential_base_lsn,
    differential_base_guid,
    is_copy_only
FROM msdb.dbo.backupset
WHERE database_name = N'VssBaseTest'
ORDER BY backup_finish_date;
```

If `D2` retains `F1`'s base relationship, the tested operation did not redirect it. If `D2` points to the third-party operation, that operation established a new base and must be retained and cataloged with dependent differentials.

Repeat for every job mode, product upgrade, SQL Server upgrade, and relevant policy change. Also test restore through the vendor workflow, since a snapshot-based base may not appear as a standalone `.bak` you can restore natively.

## Build One Cross-Tool Catalog

`msdb` on one instance is useful but insufficient. VSS snapshots may live in a separate catalog, replicas have separate `msdb` histories, and native media can be copied or expired independently.

The central inventory should associate:

- database identity and availability-group context;
- operation type and producing tool/version;
- native full, copy-only, differential, log, or snapshot semantics;
- base LSN/GUID and first/last LSNs where applicable;
- all media or snapshot identifiers and their expiration;
- TDE and backup-encryption key dependencies;
- application-consistency status;
- most recent successful restore test.

Block deletion of a base while a retained recovery point depends on it. Coordinate retention across the SQL, VM, snapshot, and object-storage systems.

## Avoid Two Dangerous Assumptions

**“Snapshots never affect SQL backup state.”** The storage mechanism alone does not determine how the requester coordinates with SQL Server. Verify the actual workflow.

**“Every full resets the differential base.”** Copy-only fulls explicitly do not, and not every vendor full is a native regular database full.

Also keep the log chain separate in your reasoning. A regular full can change the differential base without breaking the transaction log chain. A product option that affects log truncation or uses copy-only logs has another set of consequences.

## Recover From an Unexpected Change

If later differentials depend on an unplanned third-party base, immediately extend that base's retention and copy it into protected storage where supported. Export metadata and run a restore drill. If it has already expired, select another complete full/differential pair or a viable full-plus-log sequence; a differential cannot be attached to a different base.

For future ad hoc operations, configure copy-only when the product and use case support it. If the third-party job is meant to own regular bases, make it the authoritative catalog and have native jobs discover its base rather than maintaining contradictory schedules.

## Official Documentation

- [SQL Server backup applications, VSS, and SQL Writer](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/sql-server-vss-writer-backup-guide?view=sql-server-ver17)
- [SQL Server VSS Writer logging](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/sql-server-vss-writer-logging?view=sql-server-ver17)
- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
