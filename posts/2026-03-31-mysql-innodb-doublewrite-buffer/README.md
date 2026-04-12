# What Is the InnoDB Doublewrite Buffer in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Doublewrite Buffer, Crash Recovery, Data Integrity

Description: The InnoDB doublewrite buffer prevents partial page writes during crashes by writing pages to a safe area before their final destination on disk in MySQL.

---

## Overview

The InnoDB doublewrite buffer is a crash-safety mechanism that protects against a specific failure scenario called a partial page write or torn page. A MySQL page is typically 16KB, but operating system writes may be done in smaller units (often 4KB). If MySQL crashes in the middle of writing a 16KB page, the page on disk could contain a mix of old and new data - this is a corrupted, or "torn," page.

The redo log cannot recover from a torn page because the redo log applies changes on top of existing page data. If the base page is corrupt, the redo log cannot reconstruct it. The doublewrite buffer solves this problem.

## How the Doublewrite Buffer Works

Before InnoDB writes dirty pages from the buffer pool to their actual locations in the data files, it first writes those pages sequentially to a dedicated area - the doublewrite buffer. Only after that write is complete does InnoDB write the pages to their actual positions.

```text
Dirty pages in buffer pool
  --> Written sequentially to doublewrite buffer (safe area)
    --> If this crashes, original pages on disk are still intact
  --> Then written to actual data file locations
    --> If this crashes, doublewrite buffer copy is intact
      --> On recovery: InnoDB checks pages; if corrupt, restores from doublewrite buffer
```

Because the doublewrite buffer write is sequential and happens before the actual write, InnoDB always has a clean copy to restore from in case of a mid-write crash.

## Checking Doublewrite Buffer Status

```sql
-- Check if the doublewrite buffer is enabled
SHOW VARIABLES LIKE 'innodb_doublewrite';

-- Monitor doublewrite writes
SHOW STATUS LIKE 'Innodb_dblwr_writes';
SHOW STATUS LIKE 'Innodb_dblwr_pages_written';

-- Calculate pages per doublewrite write (efficiency ratio)
SELECT
  (SELECT variable_value FROM performance_schema.global_status
   WHERE variable_name = 'Innodb_dblwr_pages_written') /
  (SELECT variable_value FROM performance_schema.global_status
   WHERE variable_name = 'Innodb_dblwr_writes') AS pages_per_write;
```

## Configuration in MySQL 8.0

MySQL 8.0.20 introduced dedicated doublewrite files, separating them from the system tablespace for better I/O performance and more flexibility.

```sql
-- Check the directory for doublewrite files (MySQL 8.0.20+)
SHOW VARIABLES LIKE 'innodb_doublewrite_dir';

-- Number of doublewrite files (MySQL 8.0.20+)
SHOW VARIABLES LIKE 'innodb_doublewrite_files';
```

```ini
# In my.cnf - set the number of doublewrite files (improves parallel write throughput)
# Default is 2x innodb_buffer_pool_instances
# This is a startup-only variable and cannot be changed at runtime
innodb_doublewrite_files = 4
```

## When to Disable the Doublewrite Buffer

```sql
-- Disable the doublewrite buffer (NOT recommended for production)
-- This can improve write performance by ~5-10% but risks data corruption on crash
-- Only consider for replicas that can be rebuilt, or for temporary batch loads
```

```ini
# In my.cnf - disable doublewrite buffer
innodb_doublewrite = OFF
```

The doublewrite buffer typically adds only 5-10% overhead because the extra writes are sequential - much faster than random I/O. On modern SSDs or storage systems with hardware-level atomic write support, the risk of torn pages is lower, and some deployments disable it. However, for most production environments, leaving it enabled is the safe default.

## Verifying Doublewrite Buffer Recovery

If InnoDB detects a torn page during startup, it automatically recovers it from the doublewrite buffer. This process is transparent:

```text
# MySQL error log during recovery from torn page:
InnoDB: Restoring page [page_id:5:1234] from doublewrite buffer.
```

## Summary

The InnoDB doublewrite buffer prevents data corruption from partial page writes by writing pages to a sequential safe area before writing them to their actual data file locations. If a crash occurs mid-write, InnoDB recovers the clean copy from the doublewrite buffer during restart. The performance overhead is typically small because the extra writes are sequential. MySQL 8.0.20 improved the implementation by using dedicated doublewrite files. The doublewrite buffer is a critical safeguard for data integrity and should remain enabled in production environments.
