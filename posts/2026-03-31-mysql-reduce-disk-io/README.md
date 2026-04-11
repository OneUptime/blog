# How to Reduce MySQL Disk I/O

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance, Storage, InnoDB, Optimization

Description: Reduce MySQL disk I/O by tuning the buffer pool, enabling InnoDB compression, optimizing query patterns, and configuring flush settings to minimize unnecessary disk writes.

---

Excessive disk I/O is one of the most common MySQL performance bottlenecks. High I/O manifests as slow queries, `iowait` spikes in system metrics, and `Innodb_buffer_pool_wait_free` events in MySQL status. Reducing I/O comes from multiple angles: caching more data in memory, compressing data on disk, and reducing unnecessary write amplification.

## Diagnosing Disk I/O Problems

Check I/O statistics at the OS level:

```bash
# Real-time I/O stats per device
iostat -x 1 5

# I/O wait
top -b -n 1 | head -5
vmstat 1 5
```

Look for high `%iowait` in top and high `await` (average I/O wait time) in iostat. Then measure at the MySQL level:

```sql
SELECT
  variable_name,
  variable_value
FROM performance_schema.global_status
WHERE variable_name IN (
  'Innodb_data_reads',
  'Innodb_data_writes',
  'Innodb_data_fsyncs',
  'Innodb_buffer_pool_reads',
  'Innodb_buffer_pool_read_requests',
  'Innodb_buffer_pool_wait_free',
  'Innodb_os_log_written'
);
```

High `Innodb_buffer_pool_reads` relative to `Innodb_buffer_pool_read_requests` indicates insufficient buffer pool size.

## Increase Buffer Pool to Reduce Read I/O

The most effective way to reduce read I/O is keeping more data in the buffer pool:

```text
[mysqld]
innodb_buffer_pool_size = 24G
innodb_buffer_pool_instances = 8

# Warm up buffer pool from disk on startup
innodb_buffer_pool_dump_at_shutdown = ON
innodb_buffer_pool_load_at_startup = ON
innodb_buffer_pool_dump_pct = 25
```

## Reduce Write I/O with Flush Tuning

InnoDB writes to the redo log and the doublewrite buffer on every committed transaction. Relaxing durability requirements reduces write I/O:

```text
[mysqld]
# Flush every second instead of per transaction (risk: up to 1 sec data loss on crash)
innodb_flush_log_at_trx_commit = 2

# Write binary log less frequently
sync_binlog = 100

# Use direct I/O to avoid OS page cache overhead
innodb_flush_method = O_DIRECT
```

## Compress InnoDB Tables

Table compression reduces the amount of data read from and written to disk:

```sql
-- Check current page sizes
SHOW VARIABLES LIKE 'innodb_page_size';

-- Create a new table with compression
CREATE TABLE logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  message TEXT,
  level VARCHAR(10),
  created_at DATETIME,
  PRIMARY KEY (id)
) ENGINE=InnoDB ROW_FORMAT=COMPRESSED KEY_BLOCK_SIZE=8;

-- Monitor compression statistics (aggregated by page size)
SELECT
  page_size,
  compress_ops,
  compress_ops_ok,
  compress_time,
  uncompress_ops
FROM information_schema.INNODB_CMP;
```

## Eliminate I/O from Redundant Indexes

Each index on a write-heavy table incurs additional I/O for every INSERT, UPDATE, or DELETE. Remove unused indexes:

```sql
-- Find indexes with zero reads (potentially unused)
SELECT
  object_schema,
  object_name,
  index_name,
  count_read,
  count_write
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name != 'PRIMARY'
  AND count_read = 0
ORDER BY count_write DESC
LIMIT 20;

-- Drop an unused index
ALTER TABLE events DROP INDEX idx_old_unused;
```

## Reduce Temporary Table Disk I/O

Queries that spill temporary tables to disk generate significant I/O:

```sql
-- Check for disk temporary table creation
SHOW GLOBAL STATUS LIKE 'Created_tmp_disk_tables';

-- Increase in-memory temp table size
SET GLOBAL tmp_table_size = 67108864;
SET GLOBAL max_heap_table_size = 67108864;
```

## Summary

Reducing MySQL disk I/O requires attacking both read and write I/O paths. Increase the buffer pool to keep hot data in memory and use dump/load to preserve warmth across restarts. Reduce write I/O by relaxing flush settings with `innodb_flush_log_at_trx_commit = 2` for non-critical workloads and enabling `O_DIRECT` to bypass double-buffering. Compress large tables to reduce both storage footprint and I/O volume, and remove unused indexes to eliminate write amplification on heavily updated tables.
