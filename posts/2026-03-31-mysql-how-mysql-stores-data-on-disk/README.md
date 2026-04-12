# How MySQL Stores Data on Disk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Tablespace, Storage, Internal

Description: Learn how MySQL InnoDB stores data on disk using tablespace files, pages, segments, and extents, and what this means for performance tuning.

---

## The InnoDB Storage Model

InnoDB is the default MySQL storage engine. It stores all data in tablespace files on disk. Understanding this layout helps explain how queries perform, why fragmentation happens, and how to tune storage settings effectively.

## Tablespace Files

InnoDB uses several types of tablespace files:

- **System tablespace** (`ibdata1`): contains the change buffer and (in versions before MySQL 8.0) the data dictionary and doublewrite buffer.
- **File-per-table tablespaces** (`.ibd` files): one `.ibd` file per table when `innodb_file_per_table = ON` (the default since MySQL 5.6).
- **Undo tablespaces** (`undo_001`, `undo_002`): store undo log segments for MVCC.
- **Temporary tablespace** (`ibtmp1`): rollback segments for user-created temporary tables.

```sql
SHOW VARIABLES LIKE 'innodb_file_per_table';
-- ON means each table gets its own .ibd file under the data directory

SELECT SPACE, NAME, FILE_SIZE, ALLOCATED_SIZE
FROM information_schema.INNODB_TABLESPACES
LIMIT 20;
```

## Pages: The Basic I/O Unit

InnoDB reads and writes data in fixed-size pages. The default page size is 16 KB:

```sql
SHOW VARIABLES LIKE 'innodb_page_size';
-- 16384 bytes (16 KB) by default
```

A page holds rows, index entries, or administrative metadata. MySQL always reads and writes whole pages even if only one row changed. This is why large row sizes hurt performance - fewer rows fit per page, leading to more I/O.

## Extents and Segments

Pages are grouped into extents (1 MB each by default = 64 pages of 16 KB). Extents are grouped into segments:

- **Leaf segment**: holds the leaf pages of a B-Tree (actual row data for clustered indexes).
- **Non-leaf segment**: holds the internal B-Tree nodes (index entries).
- **Rollback segment**: holds undo log records.

InnoDB allocates pages within an extent contiguously where possible, improving sequential read performance.

## Clustered Index: Data Is the Index

InnoDB stores rows in the B-Tree of the primary key (the clustered index). There is no separate row heap - the data is the index:

```sql
-- Viewing the primary key as the clustered index
EXPLAIN SELECT * FROM orders WHERE id = 42;
-- type = 'const', key = 'PRIMARY' - single-page lookup
```

Secondary indexes store the primary key value in their leaf nodes and do a second lookup into the clustered index. This is called a double lookup or bookmark lookup.

## Doublewrite Buffer

Before writing a page to its real location on disk, InnoDB first writes it sequentially to the doublewrite buffer. In MySQL 8.0.20 and later, the doublewrite buffer is stored in separate `.dblwr` files; in earlier versions it was part of the system tablespace. This prevents partial page writes (torn pages) on crash:

```sql
SHOW VARIABLES LIKE 'innodb_doublewrite';
SHOW STATUS LIKE 'Innodb_dblwr_writes';
```

On filesystems that natively support atomic writes (like ZFS or certain NVMe controllers), you can disable the doublewrite buffer with `innodb_doublewrite = OFF` to improve write throughput.

## Checking Physical Table Size

```sql
SELECT
  table_name,
  ROUND(data_length  / 1024 / 1024, 2) AS data_mb,
  ROUND(index_length / 1024 / 1024, 2) AS index_mb,
  ROUND(data_free    / 1024 / 1024, 2) AS fragmented_mb
FROM information_schema.TABLES
WHERE table_schema = 'myapp'
ORDER BY (data_length + index_length) DESC;
```

The `data_free` column shows pages allocated but not used - a sign of fragmentation after many deletes.

## Summary

MySQL InnoDB stores data in tablespace files divided into 16 KB pages, grouped into 1 MB extents, organized into segments per B-Tree. Row data lives in the clustered index (the primary key B-Tree), not in a separate heap. Every I/O transfers complete pages. The doublewrite buffer protects against torn writes on crash. Understanding this model explains why primary key selection, row size, and fragmentation all directly impact I/O performance.
