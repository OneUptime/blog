# How to Understand InnoDB Architecture in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Architecture, Performance, Storage

Description: A practical overview of MySQL InnoDB architecture including the buffer pool, redo log, undo log, and how they work together for ACID compliance.

---

## InnoDB Architecture Overview

InnoDB is MySQL's default transactional storage engine. It provides ACID-compliant transactions, row-level locking, and crash recovery. Understanding its key components helps with performance tuning, troubleshooting, and capacity planning.

The main components are:

- Buffer Pool - in-memory cache for data and index pages
- Redo Log - write-ahead log for crash recovery
- Undo Log - stores old row versions for MVCC and rollback
- Change Buffer - defers secondary index writes
- Doublewrite Buffer - protects against partial page writes

## The Buffer Pool

The buffer pool is the most important InnoDB memory structure. It caches data pages (16KB each by default) and index pages to avoid disk reads:

```sql
-- Check current buffer pool size
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- View buffer pool statistics
SHOW STATUS LIKE 'Innodb_buffer_pool%';

-- Buffer pool hit rate (higher is better - target >99%)
SELECT
    (Innodb_buffer_pool_read_requests - Innodb_buffer_pool_reads)
    / Innodb_buffer_pool_read_requests * 100 AS hit_rate_pct
FROM (
    SELECT
        VARIABLE_VALUE AS Innodb_buffer_pool_read_requests
    FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests'
) r,
(
    SELECT VARIABLE_VALUE AS Innodb_buffer_pool_reads
    FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads'
) d;
```

Set the buffer pool to 70-80% of available RAM for dedicated database servers.

## The Redo Log

The redo log (transaction log) is a write-ahead log on disk. Every change is written to the redo log before being applied to data files, enabling crash recovery:

```sql
-- Configure redo log size (requires restart in MySQL < 8.0.30)
SHOW VARIABLES LIKE 'innodb_log_file_size';

-- In MySQL 8.0.30+: can be changed dynamically
SET GLOBAL innodb_redo_log_capacity = 4294967296;  -- 4GB
```

A larger redo log improves write-heavy workload performance by reducing checkpoint frequency.

## The Undo Log

The undo log stores before-images of rows for two purposes:

1. Transaction rollback - reverting uncommitted changes
2. MVCC - providing consistent snapshots to readers

```sql
-- Check undo log (history list) length
SHOW ENGINE INNODB STATUS\G
-- Look for: History list length

-- Long-running transactions grow the undo log
SELECT trx_id, TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_sec
FROM information_schema.INNODB_TRX
ORDER BY trx_started;
```

## The Change Buffer

The change buffer defers writes to secondary index pages when those pages are not in the buffer pool:

```sql
-- Configure which operations use the change buffer
SHOW VARIABLES LIKE 'innodb_change_buffering';
-- Default: all (buffers inserts, deletes, updates to secondary indexes)

-- Monitor change buffer usage
SHOW ENGINE INNODB STATUS\G
-- Look for: INSERT BUFFER AND ADAPTIVE HASH INDEX section
```

## The Doublewrite Buffer

The doublewrite buffer provides protection against partial page writes during a crash:

```sql
-- Check if doublewrite is enabled
SHOW VARIABLES LIKE 'innodb_doublewrite';
-- Default: ON

-- Disable on systems with atomic write support (e.g., ZFS, Fusion-io)
-- innodb_doublewrite = 0  (saves ~5-10% write I/O overhead)
```

## Tablespace Files

```bash
# View InnoDB data files
ls -lh /var/lib/mysql/<database>/*.ibd  # Per-table files (innodb_file_per_table=ON)
ls -lh /var/lib/mysql/ibdata1           # System tablespace
ls -lh /var/lib/mysql/#ib_redo*         # Redo log files (MySQL 8.0.30+)
```

```sql
-- List all InnoDB tablespaces
SELECT SPACE, NAME, FILE_SIZE
FROM information_schema.INNODB_TABLESPACES
ORDER BY FILE_SIZE DESC
LIMIT 10;
```

## Viewing the Full InnoDB Status

```sql
-- Comprehensive InnoDB status report
SHOW ENGINE INNODB STATUS\G
```

Key sections to review:
- BUFFER POOL AND MEMORY - cache hit rates, page statistics
- LOG - redo log sequence numbers, checkpoint age
- TRANSACTIONS - active transactions, lock waits
- SEMAPHORES - internal mutex contention

## Summary

InnoDB's architecture centers around the buffer pool for caching, the redo log for durability, and the undo log for MVCC and rollbacks. The change buffer and doublewrite buffer optimize secondary index writes and protect against partial page writes. Understanding these components is fundamental to effective InnoDB performance tuning and troubleshooting.
