# How to Understand InnoDB Page Structure in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Page Structure, Storage Engine

Description: Learn how InnoDB organizes data inside 16 KB pages, including page header, infimum/supremum records, the record heap, free space, and the page directory.

---

## What Is an InnoDB Page?

InnoDB is the default MySQL storage engine, and the fundamental unit of storage is the **page** - 16 KB by default. Every read and write operation against InnoDB data works in whole pages. All tables, indexes, rollback segments, and system data are organized as collections of pages.

```sql
-- Confirm default page size
SHOW VARIABLES LIKE 'innodb_page_size';
-- innodb_page_size = 16384 (16 KB)

-- Change page size only at initialization time (not hot-changeable)
-- innodb_page_size = 8192  (8 KB) or 32768 (32 KB)
```

## Page Types

InnoDB uses different page types for different purposes:

```text
FIL_PAGE_INDEX          - B-tree index page (data + secondary indexes)
FIL_PAGE_UNDO_LOG       - undo log page (MVCC rollback history)
FIL_PAGE_INODE          - segment inode page (extent tracking)
FIL_PAGE_IBUF_FREE_LIST - insert buffer free list
FIL_PAGE_TYPE_SYS       - system page
FIL_PAGE_TYPE_BLOB      - overflow page for large columns
```

## Anatomy of an Index Page

A data page (FIL_PAGE_INDEX) has the following layout from top to bottom:

```text
Offset  Size  Description
------  ----  -----------
0       38    File Header (page number, space ID, checksum, LSN, page type)
38      56    Page Header (heap top, free list, record count, direction)
94      13    Infimum Record (virtual minimum record)
107     13    Supremum Record (virtual maximum record)
120     var   User Records (variable-length rows stored here)
...     var   Free Space (shrinks as records and directory slots are added)
...     var   Page Directory (array of slot offsets, grows up from bottom)
16376   8     File Trailer (checksum + LSN for corruption detection)
```

## Infimum and Supremum Records

Every InnoDB page contains two virtual records that act as sentinels:

- **Infimum** - always the smallest record in the page; no user record is smaller.
- **Supremum** - always the largest record; used to mark the end of the chain.

Records inside the page are linked in a singly-linked list from infimum through all user records to supremum, ordered by primary key.

## Record Format

Each user record stores:

```text
- Variable-length column lengths (1-2 bytes each, stored in reverse column order)
- Null bitmap (variable): one bit per nullable column
- Record header (5 bytes): delete flag, heap number, ownership count, next record pointer
  (the record origin pointer points just after the header)
- Column data (actual row values)
```

```sql
-- Observe row format for a table
SELECT row_format FROM information_schema.tables
WHERE table_schema = 'mydb' AND table_name = 'orders';
-- DYNAMIC (default in MySQL 8.0)
```

## Page Directory

The page directory at the bottom of the page is an array of 2-byte slot offsets. Each slot points to a record in the heap. Slots are maintained in sorted order so a binary search can locate any record in O(log n) time instead of scanning the linked list sequentially.

## Free Space and the Heap

Newly inserted records consume space from the free area in the middle of the page. When records are deleted, they are marked as deleted but the space is not immediately reclaimed. Deleted records form a free list that new inserts can reuse.

```sql
-- Rebuild a table to reclaim fragmented page space
OPTIMIZE TABLE orders;
-- Rewrites the table, compacting pages and reclaiming free space
```

## Page Checksums

The file header and file trailer both contain checksums. When InnoDB reads a page, it recomputes the checksum and compares it to the stored value. A mismatch signals corruption.

```sql
SHOW VARIABLES LIKE 'innodb_checksum_algorithm';
-- crc32 (default, fast hardware-accelerated checksum)
```

## Summary

An InnoDB page is a 16 KB unit containing a file header, page header, infimum/supremum sentinels, a linked list of user records, free space, a sorted page directory for fast lookup, and a file trailer for corruption detection. Understanding this layout explains why row size limits exist (a row must fit on a page), why OPTIMIZE TABLE reclaims space, and why page size affects both storage density and read amplification.
