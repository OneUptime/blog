# How to Configure InnoDB Change Buffer in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Change Buffer, Configuration, Performance

Description: Learn how to configure the InnoDB change buffer in MySQL to optimize write performance for secondary index modifications on non-resident pages.

---

## What Is the InnoDB Change Buffer?

The InnoDB change buffer is a special data structure that caches changes to secondary index pages when those pages are not currently in the buffer pool. Rather than reading the index page from disk just to update it, InnoDB stores the pending change in the change buffer and merges it later when the page is loaded for another reason.

This reduces the number of random disk I/O operations for write-heavy workloads with many secondary indexes.

## When the Change Buffer Is Used

The change buffer is used for:
- `INSERT` operations that modify secondary index pages not in the buffer pool
- `UPDATE` operations that change secondary index entries
- `DELETE` operations that mark secondary index records as deleted

It is NOT used for primary key or unique index operations, since those require immediate uniqueness checks.

## Checking the Current Change Buffer Configuration

```sql
SHOW VARIABLES LIKE 'innodb_change_buffer%';
```

```text
+-------------------------------+-------+
| Variable_name                 | Value |
+-------------------------------+-------+
| innodb_change_buffer_max_size | 25    |
| innodb_change_buffering       | all   |
+-------------------------------+-------+
```

## Configuring innodb_change_buffering

`innodb_change_buffering` controls which DML operations use the change buffer:

| Value | Operations Buffered |
|---|---|
| `all` (default) | inserts, deletes, purges |
| `none` | disabled |
| `inserts` | insert operations only |
| `deletes` | delete-marking operations only |
| `changes` | inserts and delete-marking |
| `purges` | background purge operations only |

```text
[mysqld]
innodb_change_buffering = all
```

Or dynamically:

```sql
SET GLOBAL innodb_change_buffering = 'all';
```

## Configuring innodb_change_buffer_max_size

This variable limits how much of the buffer pool the change buffer can use, expressed as a percentage. The default is 25 (25% of the buffer pool).

For a write-heavy system with many secondary indexes:

```text
[mysqld]
innodb_change_buffer_max_size = 50
```

For a system with few secondary indexes or mostly read traffic:

```text
[mysqld]
innodb_change_buffer_max_size = 10
```

Dynamically:

```sql
SET GLOBAL innodb_change_buffer_max_size = 50;
```

## Monitoring Change Buffer Activity

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `INSERT BUFFER AND ADAPTIVE HASH INDEX` section:

```text
-------------------------------------
INSERT BUFFER AND ADAPTIVE HASH INDEX
-------------------------------------
Ibuf: size 1, free list len 0, seg size 2, 0 merges
merged operations:
 insert 0, delete mark 0, delete 0
discarded operations:
 insert 0, delete mark 0, delete 0
```

Also from the `INFORMATION_SCHEMA.INNODB_METRICS` table:

```sql
SELECT NAME, COUNT, STATUS
FROM INFORMATION_SCHEMA.INNODB_METRICS
WHERE SUBSYSTEM = 'change_buffer';
```

```text
+--------------------------------------+-------+---------+
| NAME                                 | COUNT | STATUS  |
+--------------------------------------+-------+---------+
| ibuf_merges_insert                   | 87600 | enabled |
| ibuf_merges_delete_mark              | 12300 | enabled |
| ibuf_merges_delete                   |  4500 | enabled |
| ibuf_merges                          | 45000 | enabled |
| ibuf_merges_discard_insert           |     0 | enabled |
| ibuf_merges_discard_delete_mark      |     0 | enabled |
| ibuf_merges_discard_delete           |     0 | enabled |
| ibuf_size                            |     1 | enabled |
+--------------------------------------+-------+---------+
```

## When to Disable the Change Buffer

Consider disabling the change buffer (`innodb_change_buffering = none`) when:

- The server has very fast SSD storage where random I/O is cheap.
- The workload is mostly reads with infrequent writes.
- The buffer pool is large enough to hold all active index pages.

On fast NVMe storage, the change buffer overhead of eventually merging entries may outweigh the benefit of deferred writes.

## Summary

The InnoDB change buffer defers secondary index updates to reduce random I/O for write-heavy workloads. Use `innodb_change_buffering = all` and `innodb_change_buffer_max_size = 25-50` for write-intensive systems. Monitor via `SHOW ENGINE INNODB STATUS` to verify merge activity. On fast SSD storage with large buffer pools, the change buffer may provide less benefit and can be reduced or disabled.
