# When a Differential Backup Is Nearly as Large as a Full Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Differential Backup, Full Backup, RTO, Backup Performance

Description: Decide when a large SQL Server differential still helps and when to establish a new full base using measured backup and restore behavior.

---

When a SQL Server differential backup is nearly as large as a full, most allocated extents may have changed since its base—or compression and data layout may make the output sizes look similar. At that point the differential's backup-time advantage often shrinks, while restore still requires both the full and differential.

The practical response is usually to take a new scheduled full soon, but first confirm the real base, compare uncompressed and compressed sizes, and measure end-to-end restore time.

## Why the Sizes Converge

A database differential is cumulative. SQL Server uses DCM bits to track 64 KiB extents changed since the base full. As the workload touches more distinct extents, later differentials contain a larger portion of the database.

The changed fraction can grow because of normal writes, index rebuilds, broad ETL updates, page movement, LOB rewrites, or simply an old base. A small logical update distributed across many extents can be more important than a large update concentrated in a few extents.

A copy-only full does not reset this accumulation. Only a qualifying regular full establishes a new differential base for conventional database differentials.

## Compare Like With Like

Use `msdb.dbo.backupset`:

```sql
SELECT TOP (40)
    backup_start_date,
    backup_finish_date,
    type,
    backup_size / 1024.0 / 1024 / 1024 AS backup_gb,
    compressed_backup_size / 1024.0 / 1024 / 1024 AS compressed_gb,
    DATEDIFF(second, backup_start_date, backup_finish_date) AS duration_seconds,
    database_backup_lsn,
    differential_base_lsn,
    is_copy_only
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
  AND type IN ('D', 'I')
ORDER BY backup_finish_date DESC;
```

Compare:

- logical `backup_size`, which better reflects the backup's uncompressed data volume;
- `compressed_backup_size`, which reflects stored and transferred bytes;
- duration and throughput;
- source read I/O and CPU;
- restore duration for full only versus full plus differential.

Compression ratios can differ. A full containing older, highly compressible pages may produce a stored file close to a differential containing newer, less-compressible pages even when their logical sizes differ. Conversely, sparse or unused portions and allocation patterns affect what a full actually writes.

## Verify the Base Before Changing the Schedule

An unexpectedly large differential may still be based on an older full because the scheduled full failed. Or an administrator may have taken a normal ad hoc full that became the new base. Read `DifferentialBaseLSN` and GUID from `RESTORE HEADERONLY` and find the exact retained base.

If the only recent full was copy-only, differential growth correctly continues from the previous regular full. Replacing the copy-only backup with a normal full is appropriate only when you intend to establish and retain a new base.

## Does the Differential Still Save Restore Time?

Restoring a differential requires:

1. locating and staging its matching full;
2. restoring the full with `NORECOVERY`;
3. restoring the differential;
4. applying any required subsequent logs;
5. recovering and validating the database.

If the differential is almost full-size, step 3 may add substantial I/O while saving only the log replay between the base and differential. It can still help when that log interval is expensive, or when the differential is the desired discrete recovery point. Do not discard it based only on a percentage.

Run two drills against comparable storage:

- base full + latest large differential + subsequent logs;
- a newer full + subsequent logs.

Measure until the application passes validation. Include object download, decryption, file initialization, recovery, `DBCC CHECKDB`, and application startup.

## Establish a New Base Deliberately

Microsoft recommends periodic full backups as differentials increase. Schedule a new regular full when large differentials threaten the backup window, storage budget, or RTO. Catalog its header metadata, replicate it to protected storage, and restore-test it before expiring the prior chain.

After the full, verify that a new differential reports the expected base. If a third-party tool owns backups, confirm whether its “full” operation establishes a native differential base or creates a copy-only backup.

Avoid immediately deleting the old base and differentials. They may contain the last clean recovery point before unnoticed logical corruption, and the new full may depend on a certificate or storage path not yet proven in the recovery environment.

## Set an Operational Threshold

Choose a trigger tied to service objectives, such as:

- full-plus-differential restore exceeds 70 percent of the RTO budget;
- differential duration overlaps production peak or the next backup;
- stored size exceeds a tested cost threshold;
- differential-to-full logical size ratio exceeds a workload-specific level for several runs;
- the base age exceeds the period covered by successful recovery drills.

The ratio is an early-warning signal, not the objective itself. A 90 percent differential that completes and restores quickly may be acceptable; a 40 percent differential on slow remote storage may already violate RTO.

When the backup is nearly full-size, the right question is not “Is SQL Server broken?” It is “Does this recovery chain still meet the tested time, cost, and retention requirements?”

## Official Documentation

- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server pages and extents architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Create a differential SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Backup compression](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)
