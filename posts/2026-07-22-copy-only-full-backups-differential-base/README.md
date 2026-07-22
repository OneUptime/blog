# Copy-Only Full Backups and Differential Bases: What DBAs Need to Know

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Copy-Only Backup, Differential Backup, Backup Strategy, DBA

Description: Use SQL Server copy-only full backups for ad hoc needs without redirecting the scheduled differential base or confusing restore automation.

---

A copy-only full backup is an independent SQL Server full backup that can be restored normally but cannot become a differential base and does not affect the existing base. Use it when you need an ad hoc full-for a migration, investigation, or test refresh-without changing which full backup later differentials depend on.

That small option prevents one of the most damaging backup-coordination failures: a scheduled differential silently depending on an ad hoc full that is later deleted.

## Normal Full Backups Establish Bases

Assume the scheduled plan takes a regular full on Sunday and differentials each night:

```text
Sunday F1 regular full
Monday D1 -> F1
Tuesday D2 -> F1
```

If an administrator takes another normal full `F2` on Wednesday, the next database differential uses `F2` as its base:

```text
Wednesday F2 regular full
Thursday D3 -> F2
```

This is valid SQL Server behavior. The operational failure happens if the administrator treats `F2` as disposable while the scheduled system assumes Thursday's `D3` still belongs to Sunday. Retaining `F1` and `D3` does not produce a valid pair.

## `COPY_ONLY` Leaves the Base Alone

Create the ad hoc backup explicitly:

```sql
BACKUP DATABASE Sales
TO DISK = 'E:\SQLBackups\Sales_migration_copy.bak'
WITH COPY_ONLY,
     CHECKSUM,
     COMPRESSION,
     INIT,
     STATS = 10;
```

Microsoft documents these properties for a copy-only full:

- it cannot serve as the base for a differential;
- it does not affect the existing differential base;
- it restores the same way as another full backup.

After the command above, the next scheduled differential continues to use the prior regular full. The copy-only backup itself is a complete data backup that can be restored independently; it is not “partial” or unsuitable for recovery.

`COPY_ONLY` has no effect when specified with `DIFFERENTIAL`. A differential's job is to depend on a base; there is no useful copy-only differential sequence.

## Verify Rather Than Assume

Read media metadata:

```sql
RESTORE HEADERONLY
FROM DISK = 'E:\SQLBackups\Sales_migration_copy.bak';
```

Check `BackupTypeDescription`, `IsCopyOnly`, database identity, backup times, LSNs, and backup-set `Position`. SQL Server also records `is_copy_only` in `msdb.dbo.backupset`:

```sql
SELECT TOP (20)
    backup_start_date,
    backup_finish_date,
    type,
    is_copy_only,
    first_lsn,
    database_backup_lsn,
    differential_base_lsn
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
ORDER BY backup_finish_date DESC;
```

Do not trust a UI label, filename, or third-party job name without checking resulting SQL Server metadata. Some tools may intentionally take copy-only fulls; others may establish a base. Test the exact product, version, and configuration used in production.

## Copy-Only Log Backups Are Different

SQL Server also supports copy-only log backups under full and bulk-logged recovery. Microsoft states that a copy-only log preserves the existing log archive point and does not affect the sequencing of regular log backups; the transaction log is never truncated by a copy-only backup.

```sql
BACKUP LOG Sales
TO DISK = 'E:\SQLBackups\Sales_log_copy.trn'
WITH COPY_ONLY, CHECKSUM, COMPRESSION;
```

This is rarely required. A normal log backup can usually be retained and restored with the rest of the chain. Do not use copy-only log backups as the scheduled log strategy: because they do not advance normal truncation behavior, the log can continue growing.

The key distinction is:

- copy-only **full** protects the differential-base relationship;
- copy-only **log** protects the regular log archive point.

## When to Use a Copy-Only Full

Good cases include:

- refreshing a developer or test environment outside the backup schedule;
- seeding a migration where the file will be managed separately;
- providing a one-time copy for an investigation;
- taking a pre-change safety backup without redirecting later differentials;
- exporting a database while another team owns the scheduled backup chain.

A copy-only full is not automatically the best choice for every extra backup. If the intent is to deliberately establish a new differential base, take a regular full and coordinate retention. If the ad hoc copy must participate in a long-term recovery plan, catalog and protect it like any other backup.

## Operational Guardrails

Give backup identities permission to execute only the jobs they own, and document whether each full is regular or copy-only. Alert when an unexpected regular full appears in `msdb` or when a differential's base changes outside schedule.

For every differential, record its `DifferentialBaseLSN` and GUID and link it to the retained base object. Prevent lifecycle rules from deleting that object while dependent differentials remain. Preserve TDE certificates, credentials, and catalogs outside the database server's failure domain.

Finally, prove the semantics. Take a scheduled full, an initial differential, a copy-only full, and another differential. Verify that both differentials refer to the scheduled base, then restore the later differential on top of that base. Repeat with a normal ad hoc full and observe the base change. A short lab is safer than discovering the distinction during a disaster.

## Official Documentation

- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Create a full SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-full-database-backup-sql-server?view=sql-server-ver17)
- [RESTORE HEADERONLY reference](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-headeronly-transact-sql?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
