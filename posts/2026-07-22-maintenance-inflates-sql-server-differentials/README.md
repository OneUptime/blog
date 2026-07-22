# How Index Rebuilds, ETL Jobs, and LOB Compaction Inflate Differential Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Differential Backup, Index Rebuild, ETL, LOB, Database Maintenance

Description: Explain why maintenance and batch jobs can mark broad sets of SQL Server extents changed even when their logical business-data delta looks small.

---

SQL Server differential backups follow physical extent changes, not an application's count of inserted or updated business rows. Index rebuilds, broad ETL operations, and large-object rewrites can modify or allocate extents across a large share of the database. The next differential must capture those extents, so a routine maintenance night can produce a backup almost as large as a full.

This is not evidence that differential tracking is broken. It is the expected consequence of the Differential Change Map's 64 KiB granularity and cumulative relationship to the full base.

## The Physical Unit Behind the Backup

SQL Server stores data in 8 KiB pages, grouped into extents of eight pages. A DCM bit represents an extent and records whether it changed after the base full backup. When one page changes, that extent is relevant to the differential.

The backup does not store a semantic instruction such as “column `Status` changed on 200 rows.” It stores the changed data extents and recovery information required to recreate the differential state. Physical movement matters even when logical values do not.

## Index Rebuilds

An index rebuild constructs a new index structure and replaces the old one. It can allocate, write, sort, and deallocate pages across the index. Rebuilding a large index after the weekly full can mark a correspondingly large physical footprint for every later differential based on that full.

Reorganization works more incrementally, but it still changes pages and can mark extents. Do not assume it is “free” for differential size. Choose rebuild versus reorganize from documented index-maintenance needs, fragmentation pattern, workload, logging, available resources, and tested outcomes—not solely from backup size.

Operational options include:

- schedule the new full after the major rebuild if that produces a better recovery cycle;
- rebuild only indexes that have a demonstrated benefit;
- use partition-level work where the schema and workload support it;
- correlate backup growth with actual maintenance timestamps and objects;
- test how online, resumable, and offline options affect your version and environment.

## ETL and Warehouse Loads

ETL often amplifies physical change:

- a wide `UPDATE` can touch pages throughout a fact table;
- a `MERGE` can combine inserts, updates, and deletes over a broad key range;
- truncate-and-reload patterns replace large allocations;
- staging transformations and index creation can rewrite durable staging objects; work confined to `tempdb` does not enlarge a user-database differential;
- partition switching is a metadata operation, but preparing the incoming partition may still produce substantial backup data in the same database.

Measure changed extents and actual backup output around representative jobs. Row counts, input-file size, and transaction-log generation describe different aspects of the work and should not be substituted for differential-backup measurements.

## LOB Rewrites and Compaction

Large object values may live outside the in-row record. Updates to `varchar(max)`, `nvarchar(max)`, `varbinary(max)`, XML, and legacy LOB storage can allocate new pages and release old ones. A process that compresses, migrates, or normalizes LOB data can therefore touch many extents even if the final logical data size shrinks.

Shrinking files is not a general maintenance solution. It moves pages, can create index fragmentation, and causes repeated growth if the space is needed again. Microsoft recommends shrinking only when necessary, such as after a large one-time data removal where the space will not be reused. Page movement itself can expand the changed footprint.

## Find the Correlation

Start with backup history:

```sql
SELECT
    backup_start_date,
    backup_finish_date,
    type,
    backup_size,
    compressed_backup_size,
    database_backup_lsn,
    differential_base_lsn
FROM msdb.dbo.backupset
WHERE database_name = N'Warehouse'
  AND type IN ('D', 'I')
ORDER BY backup_finish_date;
```

Overlay SQL Agent job history, deployment logs, index-maintenance output, ETL batch IDs, and file-growth events. Compare a normal cycle with one containing the suspected work. A jump immediately after a rebuild or reload provides a testable hypothesis; repeat it in a restored copy if production experimentation is risky.

Keep compressed and uncompressed sizes separate. Compression can hide or exaggerate the visible file-size ratio as data compressibility changes. Also compare backup duration and source-read volume.

## Choose the Base Around the Workload

If a planned job reliably rewrites most of the database, a regular full after the job can establish a clean base for the rest of the cycle. A full before the job means every subsequent differential captures the rewritten footprint.

That does not make “full after every rebuild” a universal rule. Full backups consume I/O, network, storage, and time. Model two schedules and restore-test both:

```text
Plan A: full -> maintenance -> growing differentials
Plan B: maintenance -> full -> smaller early differentials
```

Consider when a failure is most likely, which pre-maintenance recovery points must be retained, and whether the full fits its window. Keep the old chain until the new full has been copied, cataloged, and restored successfully.

## Avoid Counterproductive Optimizations

Do not disable checksums, reduce backup retention, avoid necessary integrity work, or leave indexes unhealthy merely to reduce the next `.bak`. Do not create a copy-only full expecting it to reset differential growth; by definition it leaves the base unchanged.

Instead, define thresholds from RTO and RPO. Alert when differential duration or size departs from its baseline. Explain expected spikes in the change calendar. When a differential approaches a full, compare actual full-versus-differential restore time and production impact, then change cadence deliberately.

Differential growth is useful telemetry. It shows the physical breadth of change since the base and can reveal a workload or maintenance shift long before a recovery drill misses its deadline.

## Official Documentation

- [Microsoft SQL Server pages and extents architecture guide](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Reorganize and rebuild indexes](https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17)
- [Shrink a database](https://learn.microsoft.com/en-us/sql/relational-databases/databases/shrink-a-database?view=sql-server-ver17)
- [Pages and extents architecture for large-value data](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17#large-row-support)
