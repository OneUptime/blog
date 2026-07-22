# How SQL Server Differential Backups Use the Differential Changed Map

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Differential Backup, DCM, Database Internals, Backup Performance

Description: Learn how SQL Server's Differential Changed Map tracks changed extents, why small writes can enlarge a differential, and when a new full base resets growth.

---

SQL Server does not discover differential changes by comparing every data page with a full backup file. It maintains Differential Changed Map, or DCM, pages inside each database data file. A DCM bit tells the backup engine whether an extent has changed since the applicable full backup.

This makes differential backups efficient when a small share of the database has changed. It also explains why logical row-change volume and differential backup size can differ dramatically.

## Pages, Extents, and DCM Bits

The fundamental SQL Server data page is 8 KiB. Eight physically contiguous pages form a 64 KiB extent. A DCM page is a bitmap in which each bit represents one extent:

- `0` means SQL Server has not marked that extent as changed since the differential base;
- `1` means at least one page in that extent changed after the base.

When a differential backup runs, SQL Server consults these maps to find candidate extents rather than scanning and writing the entire database. Microsoft documents that DCM and Bulk Changed Map pages occur at the same approximate 4 GiB intervals as Global Allocation Map and Shared Global Allocation Map pages.

The unit is an extent, not a row. Updating a few bytes on one page can make the differential capture the current contents of the containing 64 KiB extent. Repeatedly updating that same extent does not add another historical copy to the same differential; the eventual backup contains the extent's state as needed for recovery.

## What Sets and Resets the Map

A normal full database backup can establish a new differential base. As data extents change after that base, their DCM bits become set. Later differential backups read those bits but do not establish a new base, so the next differential is cumulative from the same full.

```text
Sunday full:      establish base; DCM starts clean for that base
Monday changes:   extents A and B marked
Monday diff:      captures A and B
Tuesday changes:  extent C marked; A and B remain relevant
Tuesday diff:     captures A, B, and C
Wednesday full:   establishes a new base
```

A copy-only full backup is deliberately different. Microsoft specifies that it cannot serve as a differential base and does not affect the existing differential base. Use `WITH COPY_ONLY` for an ad hoc full that should not redirect the scheduled differential chain.

Do not treat the map as a user-managed backup catalog. The authoritative relationship is recorded in backup metadata, including `DifferentialBaseLSN` and `DifferentialBaseGUID`. File and partial backup strategies can have multiple differential bases, one per file; in that case the database-level base fields can be null and file-level metadata matters.

## Why Small Business Changes Can Produce Large Differentials

Consider an 800 GiB database where an overnight job updates one status column on a row in most extents. The logical payload may be modest, but the operation can mark a large fraction of extents. The differential then has to include those changed extents.

Common causes include:

- index rebuilds that allocate and rewrite many extents;
- large ETL updates, merges, and staging-table refreshes;
- page splits from random inserts into crowded indexes;
- LOB rewrites and compaction;
- maintenance that moves data even when business values barely change;
- workloads spread across a large working set.

Compression may make the `.bak` file smaller, but it does not make fewer DCM bits relevant. Compare `backup_size` with `compressed_backup_size` in `msdb.dbo.backupset` to distinguish the uncompressed backup-set size from the stored compressed size.

## Observe Differential Growth Safely

Backup history gives the most operationally meaningful evidence:

```sql
SELECT TOP (30)
    database_name,
    type,
    backup_start_date,
    backup_finish_date,
    backup_size / 1024.0 / 1024 AS backup_mb,
    compressed_backup_size / 1024.0 / 1024 AS compressed_mb,
    database_backup_lsn,
    differential_base_lsn,
    is_copy_only
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
  AND type IN ('D', 'I')
ORDER BY backup_finish_date DESC;
```

In `backupset`, `D` denotes a full database backup and `I` a differential database backup. Do not assume `msdb` is the only record you will need during a disaster; retain backup headers or export catalog metadata with the backup objects.

Some SQL Server versions expose changed-extent estimates through dynamic management views, but supported columns and behavior vary. Backup history and actual restore timing remain the durable cross-version measurements. Avoid modifying undocumented allocation pages or relying on unsupported inspection commands in production.

## DCM Is Not the Transaction Log

DCM answers a data-placement question: which extents changed since a base? The transaction log records ordered database changes needed for transactional recovery. The Bulk Changed Map, or BCM, is another allocation bitmap used with minimally logged bulk operations under the bulk-logged recovery model; it is not the DCM.

These structures enable different recovery capabilities:

- a differential plus its full base recovers to the completion state represented by that differential;
- an uninterrupted log chain can roll forward and, under applicable conditions, stop at a particular time;
- a differential can shorten a restore by providing a later data starting point, after which only subsequent log backups need applying.

Taking a differential does not truncate the transaction log, replace log backups, or begin a new log chain.

## When to Take a New Full Backup

Microsoft recommends periodically taking a new full backup because differentials increase as more extents change. Set the threshold from your environment rather than an arbitrary percentage.

Consider a new base when:

- the differential's compressed or uncompressed size approaches the full;
- differential duration threatens the backup window;
- restoring the full plus differential no longer meets RTO;
- a planned rewrite will mark much of the database;
- the base is nearing its retention or availability limit.

Do not delete the prior full as soon as a new one succeeds. Retain complete, tested recovery chains according to policy. An older differential and base may be the last clean recovery point before logical corruption.

## Validate the Mechanism Through Restore Tests

Create a test database, take a full, modify a narrow set of rows, and take a differential. Then perform an operation that touches a broad set of extents and take another differential. Record backup size and duration. Restore each differential on top of its matching full using `NORECOVERY` followed by `RECOVERY`, and run integrity and application checks.

This experiment makes the central lesson concrete: differential size follows the physical footprint of extents changed since the base, not the count of SQL statements and not merely the number of bytes in changed column values.

## Official Documentation

- [Microsoft SQL Server pages and extents architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server backup history and header information](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server copy-only backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17)
- [Create a differential SQL Server database backup](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17)
