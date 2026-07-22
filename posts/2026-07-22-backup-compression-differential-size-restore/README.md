# How Backup Compression Affects Differential Backup Size and Restore Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, Backup Compression, Differential Backup, Restore Performance, CPU

Description: Measure how SQL Server backup compression changes stored bytes, CPU, I/O, and restore duration without changing differential-base semantics.

---

SQL Server backup compression usually makes a differential backup file smaller and can make backup or restore faster when storage I/O is the bottleneck. It also consumes CPU during backup, and the result depends on data compressibility, encryption, hardware, algorithm, and destination throughput.

Compression does not change which extents a differential needs or which full is its base. It changes how the backup payload is encoded and transported.

## Separate Logical and Stored Size

`msdb.dbo.backupset` records both values:

```sql
SELECT TOP (30)
    backup_start_date,
    backup_finish_date,
    type,
    backup_size / 1024.0 / 1024 / 1024 AS logical_gb,
    compressed_backup_size / 1024.0 / 1024 / 1024 AS stored_gb,
    CAST(compressed_backup_size * 100.0 / NULLIF(backup_size, 0)
         AS decimal(6,2)) AS stored_percent,
    has_backup_checksums
FROM msdb.dbo.backupset
WHERE database_name = N'Sales'
  AND type IN ('D', 'I')
ORDER BY backup_finish_date DESC;
```

The logical size helps show how much backup content SQL Server considered. The compressed size approximates bytes written to media. A growing differential can have a stable file size if newer content compresses better, or a stable logical size can produce a larger file if content compresses worse.

Do not use `.bak` length alone to estimate changed extents.

## Enable Compression Explicitly

```sql
BACKUP DATABASE Sales
TO DISK = 'E:\SQLBackups\Sales_diff.bak'
WITH DIFFERENTIAL,
     COMPRESSION,
     CHECKSUM,
     INIT,
     STATS = 10;
```

`WITH COMPRESSION` overrides the server default for this operation. You can configure `backup compression default`, but explicit job settings are easier to audit. Compressed and uncompressed backups cannot coexist in the same media set, so use unique files or consistent media initialization rather than appending incompatible sets.

SQL Server 2025 introduces the ZSTD backup compression algorithm alongside the prior default behavior. Algorithm availability and restore compatibility depend on engine version. A backup created by a newer version cannot be restored to an older SQL Server, regardless of whether its compression looks supported.

## Backup-Time Tradeoff

Compression reduces bytes sent to disk, network shares, or object storage. On an I/O-bound backup, less output can shorten duration. Microsoft also warns that compression significantly increases CPU use by default and can affect concurrent queries.

Benchmark during representative load:

- elapsed time and effective throughput;
- CPU utilization and scheduler pressure;
- database read latency and application response time;
- destination write latency and network throughput;
- resulting logical and compressed sizes.

If CPU contention is the problem, supported editions can use Resource Governor to classify and limit backup sessions. That protects workload CPU but may extend the backup window. More stripes and larger transfer buffers can affect throughput and memory; tune them through controlled tests, not generic values.

## Restore-Time Tradeoff

Restore reads fewer bytes from the backup destination but must decompress them. On slow remote storage with available CPU, compression often improves restore throughput. On a CPU-constrained destination with fast local storage, decompression may become the limiter.

Differential restore time also includes the matching full. Test the same full-plus-differential chain with realistic staging, file initialization, log replay, recovery, and integrity checks. A 60 percent smaller differential does not imply a 60 percent shorter RTO.

Use separate timings for:

```text
object retrieval -> full restore -> differential restore
-> log restores -> recovery -> DBCC CHECKDB -> application validation
```

## Interactions With Data and Backup Encryption

Row, page, and columnstore compression change the on-disk database layout and number of pages, but Microsoft notes that data compression is distinct from backup compression. Backing up already-compressed or encrypted-looking data can yield a lower backup-compression ratio.

Backup encryption protects the backup payload and is configured with an algorithm and certificate or asymmetric key. Preserve the encryptor and private key outside the server. Test the exact combination of backup compression, encryption, and destination; do not assume the ratio or CPU cost from an unencrypted lab.

Transparent Data Encryption also affects backup behavior and key dependencies. A small encrypted `.bak` is useless if the recovery environment cannot access the required protector.

## Compression Does Not Repair Chain Problems

Compression does not:

- reset the Differential Change Map;
- make a copy-only full into a differential base;
- eliminate the need for the matching full;
- fill a missing transaction-log backup;
- validate logical database consistency;
- replace immutable off-site retention.

`WITH CHECKSUM` is complementary. It can verify page checksums where present and add a backup checksum, at additional work. Restore with checksum checking and run real restore drills; neither compressed size nor a successful command alone proves recoverability.

## Choose With Measurements

Compression is generally attractive when it reduces storage and I/O enough to fit backup and RTO windows without harming the primary workload. Keep uncompressed-versus-compressed benchmark results per database class, revisit them after data and hardware changes, and include the recovery server rather than measuring only production backup speed.

The correct metric is not the smallest `.bak`. It is the lowest operational cost that still meets tested backup, restore, integrity, and business-recovery objectives.

## Official Documentation

- [Microsoft SQL Server backup compression](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17)
- [Use Resource Governor to limit backup-compression CPU](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/use-resource-governor-to-limit-cpu-usage-by-backup-compression-transact-sql?view=sql-server-ver17)
- [backupset system table](https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17)
- [Microsoft SQL Server backup encryption](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-encryption?view=sql-server-ver17)
- [Microsoft SQL Server data compression](https://learn.microsoft.com/en-us/sql/relational-databases/data-compression/data-compression?view=sql-server-ver17)
