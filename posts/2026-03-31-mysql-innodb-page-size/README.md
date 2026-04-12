# How to Configure InnoDB Page Size in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Configuration, Storage, Performance

Description: Learn how to configure InnoDB page size in MySQL, the available options, and how page size affects storage efficiency and query performance.

---

## What Is InnoDB Page Size?

The InnoDB page size is the fundamental unit of storage and I/O in the InnoDB storage engine. All data, index, and undo log entries are organized into fixed-size pages. The default page size is 16KB, but MySQL supports sizes from 4KB to 64KB. The page size is set at database initialization time and cannot be changed without reinitializing the data directory.

## Available Page Sizes

```text
4KB   - Small pages, efficient for very small rows, increased B-tree depth
8KB   - Medium pages
16KB  - Default, suitable for most workloads
32KB  - Large pages, better for large rows and TEXT/BLOB workloads
64KB  - Maximum size, best for large sequential scans
```

## Checking the Current Page Size

```sql
SHOW VARIABLES LIKE 'innodb_page_size';
-- Default: 16384 (16KB)
```

## Setting the Page Size at Initialization

The page size must be configured before initializing the MySQL data directory:

```ini
# my.cnf - must be set BEFORE mysqld --initialize
[mysqld]
innodb_page_size = 16384   # 16KB (default)
# innodb_page_size = 8192  # 8KB
# innodb_page_size = 32768 # 32KB
# innodb_page_size = 65536 # 64KB
```

```bash
# Initialize with a specific page size
mysqld --initialize --innodb-page-size=32768
```

Once initialized, the page size is permanently embedded in the data files and cannot be changed.

## Impact on Storage and Performance

**Smaller pages (4KB, 8KB):**

```sql
-- Benefits for small rows (e.g., simple key-value tables)
CREATE TABLE session_data (
    session_id VARCHAR(32) PRIMARY KEY,
    data VARCHAR(255),
    expires_at DATETIME
) ENGINE=InnoDB;
-- 4KB or 8KB pages waste less space per leaf page for small rows
```

**Larger pages (32KB, 64KB):**

```sql
-- Benefits for large rows with TEXT/BLOB columns
CREATE TABLE documents (
    id INT PRIMARY KEY,
    title VARCHAR(255),
    body MEDIUMTEXT
) ENGINE=InnoDB;
-- 32KB or 64KB pages reduce B-tree depth for large rows
-- Sequential scan performance improves with larger page size
```

## B-Tree Depth and Fanout

The page size affects B-tree fanout (how many index entries fit per non-leaf page):

```sql
-- Estimate rows per page for a given row size
-- With 16KB pages and ~100-byte average row: ~160 rows per leaf page
-- With 4KB pages and ~100-byte average row: ~40 rows per leaf page
-- Larger fanout means fewer levels in the B-tree - fewer I/Os per lookup
```

## Monitoring Page-Level Statistics

```sql
-- View the page size being used
SELECT @@innodb_page_size;

-- Buffer pool statistics are reported in pages
SHOW STATUS LIKE 'Innodb_buffer_pool_pages_total';
-- pages_total * innodb_page_size = total buffer pool bytes

-- Check approximate page utilization
SELECT
    PAGE_TYPE,
    COUNT(*) AS page_count,
    SUM(DATA_SIZE) / 1024 / 1024 AS data_mb
FROM information_schema.INNODB_BUFFER_PAGE
GROUP BY PAGE_TYPE
ORDER BY page_count DESC;
```

## Compressed Tables and Page Size

When using ROW_FORMAT=COMPRESSED, the compressed page size must be smaller than or equal to the InnoDB page size. Note that compression is not supported with 32KB or 64KB page sizes:

```sql
-- Create a compressed table with 8KB compressed pages (on 16KB page size system)
CREATE TABLE archive_data (
    id INT PRIMARY KEY,
    payload TEXT
) ENGINE=InnoDB
  ROW_FORMAT=COMPRESSED
  KEY_BLOCK_SIZE=8;
```

## Recommendation

For most workloads, the 16KB default is optimal. Consider alternatives only when:

- Rows are very small and storage density is critical (4KB or 8KB)
- Rows contain large TEXT/BLOB columns and sequential scans dominate (32KB or 64KB)
- The underlying storage block size differs significantly from 16KB

## Summary

InnoDB page size is set at data directory initialization and determines the fundamental unit of storage and I/O. The 16KB default balances B-tree fanout, storage efficiency, and I/O granularity for most workloads. Larger pages improve performance for large-row workloads with sequential access, while smaller pages reduce waste for tiny-row tables. Changing the page size requires re-initializing the database from scratch.
