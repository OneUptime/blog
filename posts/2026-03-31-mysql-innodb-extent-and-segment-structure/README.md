# How to Understand InnoDB Extent and Segment Structure in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Extent, Storage Engine

Description: Learn how InnoDB organizes pages into extents and segments, how the tablespace is structured, and how space allocation works for B-tree indexes and undo logs.

---

## Storage Hierarchy

InnoDB organizes storage in a four-level hierarchy:

```text
Tablespace (*.ibd file)
  Segment (logical unit: leaf segment, non-leaf segment, rollback segment)
    Extent (1 MB = 64 consecutive pages at 16 KB each)
      Page (16 KB - the actual I/O unit)
```

This structure maps logical SQL objects (tables, indexes) to physical disk layout.

## Extents

An extent is 64 contiguous pages (1 MB at default 16 KB page size). InnoDB allocates extents to reduce fragmentation and improve sequential I/O performance.

```text
Page size | Pages per extent | Extent size
----------+-----------------+-----------
4 KB      | 256             | 1 MB
8 KB      | 128             | 1 MB
16 KB     | 64              | 1 MB
32 KB     | 64              | 2 MB
64 KB     | 64              | 4 MB
```

When a segment needs more space, InnoDB allocates whole extents rather than individual pages (with one exception: the first 32 pages of a small segment are allocated individually to avoid wasting space for tiny tables).

## Segments

A segment is a logical grouping of extents that serves a single purpose. Each B-tree index has two segments:

```text
Leaf node segment     - stores actual row data (primary key) or leaf index entries
Non-leaf node segment - stores internal B-tree nodes (internal pages)
```

Separating leaf and non-leaf segments improves spatial locality: full scans read only the leaf segment; range lookups rarely visit non-leaf pages.

Undo logs also use their own rollback segments, managed separately in the system tablespace or dedicated undo tablespace files.

## Tablespace Files

```sql
-- Each table in its own .ibd file (default in MySQL 8.0)
SHOW VARIABLES LIKE 'innodb_file_per_table';
-- innodb_file_per_table = ON

-- Check physical file size
SELECT table_name,
       ROUND(data_length / 1024 / 1024, 2)  AS data_mb,
       ROUND(index_length / 1024 / 1024, 2) AS index_mb
FROM information_schema.tables
WHERE table_schema = 'mydb';
```

## Inode Pages (Space Tracking)

Inode pages are a special page type that tracks which extents belong to which segment, and which pages within an extent are free or used. There is at least one inode page per tablespace.

## Free Page Management

InnoDB tracks three extent lists at the tablespace level:

```text
FREE          - extents where all 64 pages are free
FREE_FRAG     - extents where some pages are free, some used (fragment extents shared across segments)
FULL_FRAG     - extents where all 64 pages are in use (full fragment extents)
```

When all pages in a FREE_FRAG extent are consumed, it moves to FULL_FRAG. When all pages in a FULL_FRAG extent are freed, it moves back to FREE. Separately, each segment maintains its own lists (FREE, NOT_FULL, FULL) for the extents it exclusively owns.

## Observing Extent Usage

```sql
-- InnoDB tablespace stats
SELECT space, name, flag, file_size, allocated_size
FROM information_schema.innodb_tablespaces
WHERE name LIKE 'mydb/%';

-- Row count and page counts per table
SELECT table_name, table_rows,
       data_length / 16384 AS estimated_data_pages
FROM information_schema.tables
WHERE table_schema = 'mydb';
```

## Impact on Table Design

Understanding extent allocation helps with:

1. **Small tables** - InnoDB allocates individual pages first (up to 32) before committing full extents, so a tiny lookup table does not waste 1 MB upfront.
2. **Large bulk inserts** - InnoDB transitions to extent allocation, keeping rows physically sequential and reducing I/O for range scans.
3. **Index bloat after DELETE** - deleted pages remain in the extent as free fragments. `OPTIMIZE TABLE` rebuilds the table and consolidates free space.

```sql
-- Rebuild and defragment
OPTIMIZE TABLE orders;
-- For large tables consider pt-online-schema-change to avoid table lock
```

## Summary

InnoDB structures disk storage as a hierarchy: tablespace files contain segments, segments consist of extents (1 MB each), and extents contain 64 pages. Each B-tree index has separate leaf and non-leaf segments for better I/O locality. InnoDB's page-level free lists within extents enable efficient space reuse without immediate compaction, while OPTIMIZE TABLE reclaims fragmented space by rebuilding the table from scratch.
