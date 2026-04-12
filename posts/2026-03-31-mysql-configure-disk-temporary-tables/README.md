# How to Configure MySQL Disk Temporary Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Temporary Table, Disk, Performance, Configuration

Description: Learn how to configure MySQL disk temporary tables, understand when they are created, and tune settings to minimize their performance impact.

---

## Overview

MySQL creates temporary tables internally to process complex queries involving sorting, grouping, and subqueries. When these tables exceed configured size limits, MySQL spills them to disk. Understanding when disk temporary tables are created and how to configure them helps you avoid unexpected performance degradation.

## How MySQL Creates Temporary Tables

MySQL uses internal temporary tables for:

```text
- GROUP BY on non-indexed columns
- ORDER BY different from GROUP BY
- UNION operations
- Derived tables (subqueries in FROM clause)
- Subqueries using materialization
- Window functions
- DISTINCT with ORDER BY
```

## Monitoring Temporary Table Creation

```sql
-- Check temporary table counters
SHOW STATUS LIKE 'Created_tmp%';
```

```text
Created_tmp_tables      - Total internal temporary tables (in memory + on disk)
Created_tmp_disk_tables - Tables that had to be created on disk
Created_tmp_files       - Temporary files created by mysqld
```

Calculate the disk temp table ratio:

```sql
SELECT
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Created_tmp_disk_tables') /
    (SELECT VARIABLE_VALUE FROM performance_schema.global_status
     WHERE VARIABLE_NAME = 'Created_tmp_tables') * 100
    AS pct_tmp_on_disk;
```

A value above 10-20% indicates a need for tuning.

## Configuring In-Memory Temporary Table Limits

```sql
-- View current settings
SHOW VARIABLES LIKE 'tmp_table_size';
SHOW VARIABLES LIKE 'max_heap_table_size';

-- With the MEMORY engine, the effective limit is the LOWER of these two values
-- Increase both to allow larger in-memory temp tables (for TempTable engine, see below)
SET GLOBAL tmp_table_size = 64 * 1024 * 1024;       -- 64MB
SET GLOBAL max_heap_table_size = 64 * 1024 * 1024;  -- 64MB
```

## MySQL 8.0: TempTable Engine

MySQL 8.0 introduced the `TempTable` storage engine for internal temporary tables, which offers better memory management than the older `MEMORY` engine:

```sql
-- View current internal temp table engine
SHOW VARIABLES LIKE 'internal_tmp_mem_storage_engine';

-- Set to TempTable (MySQL 8.0 default)
SET GLOBAL internal_tmp_mem_storage_engine = 'TempTable';

-- TempTable memory pool size
SHOW VARIABLES LIKE 'temptable_max_ram';

-- Default is 1GB - adjust based on your workload
SET GLOBAL temptable_max_ram = 2 * 1024 * 1024 * 1024; -- 2GB
```

## Configuring the Disk Overflow Location

When TempTable exceeds `temptable_max_ram`, it maps memory-mapped files before full disk spill:

```sql
-- Control disk overflow behavior
SHOW VARIABLES LIKE 'temptable_use_mmap';
SHOW VARIABLES LIKE 'temptable_max_mmap';

-- Allow up to 4GB of memory-mapped file before full disk spill
SET GLOBAL temptable_use_mmap = ON;
SET GLOBAL temptable_max_mmap = 4 * 1024 * 1024 * 1024; -- 4GB
```

## Redirecting Temporary Tables to a Faster Disk

If disk temporary tables are unavoidable, ensure they go to a fast storage location:

```text
[mysqld]
tmpdir = /nvme/tmp
```

```bash
# Create the tmpdir on an NVMe or SSD
sudo mkdir -p /nvme/tmp
sudo chown mysql:mysql /nvme/tmp
sudo chmod 750 /nvme/tmp
```

## Making Settings Persistent

```text
[mysqld]
tmp_table_size          = 67108864
max_heap_table_size     = 67108864
internal_tmp_mem_storage_engine = TempTable
temptable_max_ram       = 2147483648
temptable_use_mmap      = ON
temptable_max_mmap      = 4294967296
tmpdir                  = /var/lib/mysql/tmp
```

## Summary

MySQL disk temporary tables are created when in-memory temporary table limits are exceeded during complex query processing. Monitor `Created_tmp_disk_tables` relative to `Created_tmp_tables` to detect excessive disk spills. Increase `tmp_table_size` and `max_heap_table_size` to allow more data to remain in memory, and configure `temptable_max_ram` for the MySQL 8.0 TempTable engine. When disk spills are unavoidable, direct `tmpdir` to the fastest available storage to minimize the performance impact.
