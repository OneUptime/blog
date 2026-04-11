# How to Configure MySQL Internal Temporary Table Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Temporary Table, Performance, Configuration, InnoDB

Description: Learn how to configure MySQL internal temporary table settings including storage engine selection, memory limits, and disk overflow behavior.

---

## Overview

MySQL's internal temporary tables are work areas the optimizer creates to process complex queries. Configuring these tables correctly balances memory usage against query performance. MySQL 8.0 introduced the TempTable engine as a superior alternative to the older MEMORY engine, offering better large-object handling and configurable memory limits.

## Internal Temporary Table Storage Engines

MySQL 8.0 supports two engines for internal temporary tables:

```sql
-- Check current engine
SHOW VARIABLES LIKE 'internal_tmp_mem_storage_engine';

-- Options: 'MEMORY' or 'TempTable'
SET GLOBAL internal_tmp_mem_storage_engine = 'TempTable';
```

Key differences:

```text
MEMORY engine:
  - Fixed size rows (wastes space for VARCHAR)
  - Does NOT support BLOB/TEXT columns (forces disk)
  - Per-table size limit: min(tmp_table_size, max_heap_table_size)

TempTable engine (MySQL 8.0+):
  - Variable-length rows (efficient for VARCHAR)
  - Supports BLOB/TEXT columns in memory
  - Shared memory pool: temptable_max_ram
  - Can overflow to memory-mapped files then disk
```

## Configuring MEMORY Engine Limits

For servers still using the MEMORY engine:

```sql
-- These two together control the maximum in-memory temp table size
-- Effective limit is min(tmp_table_size, max_heap_table_size)
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';

-- Increase both to the same value
SET GLOBAL tmp_table_size = 134217728;      -- 128MB
SET GLOBAL max_heap_table_size = 134217728; -- 128MB
```

## Configuring TempTable Engine

```sql
-- Maximum RAM for all TempTable instances (default: 1GB)
SHOW VARIABLES LIKE 'temptable_max_ram';

SET GLOBAL temptable_max_ram = 2147483648; -- 2GB

-- Enable memory-mapped file overflow before disk spill
-- Note: temptable_use_mmap was deprecated in MySQL 8.0.26.
-- Use temptable_max_mmap = 0 to disable mmap instead.
SHOW VARIABLES LIKE 'temptable_use_mmap';
SET GLOBAL temptable_use_mmap = ON;

-- Maximum size of memory-mapped files (default: 1GB)
SHOW VARIABLES LIKE 'temptable_max_mmap';
SET GLOBAL temptable_max_mmap = 4294967296; -- 4GB
```

## On-Disk Temporary Table Engine

When temporary tables spill to disk, MySQL uses a separate engine:

```sql
-- Engine for disk-based internal temporary tables
-- Note: This variable was removed in MySQL 8.0.16.
-- From 8.0.16 onward, InnoDB is always used for on-disk internal temp tables.
SHOW VARIABLES LIKE 'internal_tmp_disk_storage_engine';

-- Options (MySQL 8.0.0–8.0.15 only): 'InnoDB' or 'MyISAM'
SET GLOBAL internal_tmp_disk_storage_engine = 'InnoDB';
```

InnoDB disk temporary tables offer better performance characteristics than MyISAM, including row-level locking and crash recovery support. Note that foreign keys are not supported on any temporary tables in MySQL.

## Monitoring Temporary Table Usage

```sql
-- Overall temporary table statistics
SHOW GLOBAL STATUS LIKE 'Created_tmp%';

-- Per-session temporary table tracking via Performance Schema
SELECT
    t.PROCESSLIST_ID,
    t.PROCESSLIST_USER,
    t.PROCESSLIST_HOST,
    m.CURRENT_NUMBER_OF_BYTES_USED / 1024 / 1024 AS mb_used,
    m.HIGH_NUMBER_OF_BYTES_USED / 1024 / 1024 AS peak_mb
FROM performance_schema.threads t
JOIN performance_schema.memory_summary_by_thread_by_event_name m
    ON t.THREAD_ID = m.THREAD_ID
WHERE m.EVENT_NAME = 'memory/temptable/physical_ram'
  AND m.CURRENT_NUMBER_OF_BYTES_USED > 0
ORDER BY m.CURRENT_NUMBER_OF_BYTES_USED DESC;
```

## Queries That Always Use Disk Temporary Tables

Some query patterns force disk temporary tables regardless of size limits:

```sql
-- BLOB/TEXT columns in GROUP BY force disk (MEMORY engine only)
-- With TempTable engine, these can stay in memory
SELECT category, GROUP_CONCAT(description) AS descriptions
FROM articles
GROUP BY category;

-- Explicit temp table with BLOB column
CREATE TEMPORARY TABLE tmp_data (
    id INT,
    content LONGTEXT  -- Forces disk with MEMORY engine
);
```

## Persistent Configuration

```text
[mysqld]
# TempTable engine (recommended for MySQL 8.0)
internal_tmp_mem_storage_engine    = TempTable
temptable_max_ram                  = 2147483648
temptable_use_mmap                 = ON       # Deprecated in 8.0.26
temptable_max_mmap                 = 4294967296
# internal_tmp_disk_storage_engine is removed in 8.0.16 (InnoDB always used)

# Legacy MEMORY engine limits (used when engine=MEMORY)
tmp_table_size                     = 134217728
max_heap_table_size                = 134217728
```

## Summary

MySQL internal temporary table configuration centers on choosing the right storage engine and setting appropriate memory limits. The TempTable engine in MySQL 8.0 is superior to MEMORY - it supports BLOB/TEXT columns, uses variable-length rows, and provides a configurable shared memory pool via `temptable_max_ram`. Monitor `Created_tmp_disk_tables` to track disk spills, use Performance Schema memory events for per-session tracking, and configure `temptable_use_mmap` to allow memory-mapped file overflow as a buffer before full disk spill occurs.
