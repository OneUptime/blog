# Why SQL Server Differential Backups Keep Getting Larger

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Differential Backup, Backup Size, DCM, Database Maintenance

Description: Diagnose growing SQL Server differential backups by connecting changed extents, workload shape, maintenance, compression, and the age of the full base.

---

SQL Server differential backups usually grow between full backups because each one is cumulative. It contains the data extents changed since the differential base, not merely changes since the previous differential. As more distinct extents are modified, the differential approaches the size and duration of a full backup.

Growth is expected. Sudden or excessive growth is a signal to inspect physical change patterns, maintenance jobs, compression, and whether the intended full backup actually established a new base.

## The Cumulative Model

With a Sunday full:

```text
Monday differential    changes from Sunday through Monday
Tuesday differential   changes from Sunday through Tuesday
Wednesday differential changes from Sunday through Wednesday
```

The Tuesday differential does not depend on Monday's, but it includes extents changed on Monday if they remain part of the current data state. Taking a differential does not clear the change map or establish a new base.

SQL Server tracks changes using Differential Change Map pages. Each DCM bit represents a 64 KiB extent made of eight 8 KiB pages. If any page in that extent changes after the base, the extent becomes relevant to the differential. A tiny row update can therefore account for a full extent in the backup.

## Common Growth Drivers

**The base is old.** More time gives the workload more opportunities to touch distinct extents. A database with a wide working set may eventually change most of its allocated data between fulls.

**Index maintenance rewrites data.** An index rebuild creates and organizes index structures across many extents. Even if business rows retain the same logical values, the physical pages changed. Broad rebuild schedules can make the next differential resemble a full.

**ETL touches many rows or partitions.** A nightly `MERGE`, staging swap, mass update, or warehouse load can change extents across a large portion of the database. The number of statements is irrelevant; the changed physical footprint matters.

**LOB work moves large allocations.** Updates to `varchar(max)`, `nvarchar(max)`, `varbinary(max)`, XML, and other large values can rewrite off-row pages. Compaction and migration jobs can touch much more storage than the logical payload suggests.

**Page splits and random writes spread change.** Inserts into crowded, nonsequential index locations can allocate and reorganize pages across a wide set of extents.

**A new regular full did not run.** A failed full means later differentials still use the older base. A copy-only full is intentionally not a base, so it does not reset differential growth.

## Measure the Right Sizes

Query backup history:

```sql
SELECT TOP (60)
    backup_start_date,
    backup_finish_date,
    type,
    backup_size / 1024.0 / 1024 / 1024 AS logical_backup_gb,
    compressed_backup_size / 1024.0 / 1024 / 1024 AS stored_backup_gb,
    database_backup_lsn,
    differential_base_lsn,
    is_copy_only
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
  AND type IN ('D', 'I')
ORDER BY backup_finish_date DESC;
```

`D` is a full database backup and `I` is a database differential. Compare both `backup_size` and `compressed_backup_size`. If the logical size rises while the stored size remains flat, compression or data characteristics may be masking changed-extent growth. If both jump after a maintenance window, correlate the timestamps with SQL Agent jobs and deployment events.

Measure duration, throughput, source read I/O, CPU used by compression, destination latency, and restore duration. File size alone does not tell whether the backup still meets its purpose.

## Confirm the Actual Base

Do not assume the weekly job created the base. Read the differential header:

```sql
RESTORE HEADERONLY
FROM DISK = 'E:\SQLBackups\Sales_latest_diff.bak';
```

Match `DifferentialBaseLSN` and `DifferentialBaseGUID` to an available regular full. An unscheduled non-copy-only full can redirect later differentials. Conversely, an ad hoc copy-only full does not reset the base, so growth continues from the scheduled full.

If file or partial backups are used, the differential can be multi-based. Inspect file-level metadata rather than relying only on database-level fields.

## Decide When to Start a New Base

Microsoft recommends taking a new full at intervals as differentials increase. Use measured thresholds tied to backup and recovery objectives:

- differential backup duration nears the available window;
- source or network load affects production;
- stored differential size approaches the full;
- restoring full plus differential no longer meets RTO;
- a planned rebuild or ETL event will rewrite most allocated extents;
- the current base approaches retention or media-risk limits.

The best threshold need not be “when differential equals full.” A full may have different compression, throughput, snapshot integration, or production impact. Compare end-to-end restore tests, not only bytes.

## Reduce Surprises, Not Necessary Work

Do not skip important index or data maintenance merely to make backup graphs look smaller. Coordinate schedules and choose the right backup cadence. Partition-aware maintenance can reduce unnecessary rewrites when supported by the workload, but it must be justified by database performance and integrity goals.

Keep complete older recovery chains while validating a new full. A full job finishing successfully does not prove that it is readable off-host, has its encryption keys, or restores within RTO. Automate periodic restoration, `DBCC CHECKDB`, and business validation.

Expected differential growth becomes manageable once it is tied to a known base and measured workload. The dangerous case is an unexplained change that silently makes the recovery plan too slow or leaves its real base unretained.

## Official Documentation

- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server pages and extents architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Create a differential SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17)
