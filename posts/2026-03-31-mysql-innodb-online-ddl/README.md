# How to Perform InnoDB Online DDL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, DDL, Online DDL, Schema Migration

Description: Learn how to perform InnoDB online DDL in MySQL to add columns, indexes, and modify tables without blocking reads and writes in production.

---

Online DDL allows MySQL to execute schema changes while the table remains available for concurrent reads and writes. Introduced to avoid the painful table locks of early MySQL versions, online DDL makes it practical to alter large tables in production without taking downtime.

## DDL Algorithms: INSTANT, INPLACE, and COPY

InnoDB supports three algorithms for DDL operations:

- **INSTANT**: Modifies only metadata, completes in milliseconds regardless of table size (MySQL 8.0+)
- **INPLACE**: Rebuilds the table in-place while allowing DML, uses extra disk space during rebuild
- **COPY**: Creates a copy of the table, applies changes, then swaps - blocks writes

```sql
-- Explicitly specify algorithm and lock level
ALTER TABLE orders
    ADD COLUMN notes TEXT,
    ALGORITHM=INSTANT,
    LOCK=NONE;
```

## Checking Which Operations Support INSTANT

```sql
-- Try INSTANT first, fall back if not supported
ALTER TABLE products
    ADD COLUMN weight DECIMAL(8,2),
    ALGORITHM=INSTANT;

-- If INSTANT fails, use INPLACE with no locking
ALTER TABLE products
    ADD COLUMN weight DECIMAL(8,2),
    ALGORITHM=INPLACE, LOCK=NONE;
```

Operations that support `ALGORITHM=INSTANT` in MySQL 8.0 include adding columns (at the end or any position), adding/dropping virtual columns, changing default values, and modifying ENUM and SET member lists.

## Adding and Dropping Indexes Online

Adding indexes is one of the most common online DDL operations:

```sql
-- Add an index without blocking reads or writes
ALTER TABLE orders
    ADD INDEX idx_customer_date (customer_id, created_at),
    ALGORITHM=INPLACE, LOCK=NONE;

-- Drop an index online
ALTER TABLE orders
    DROP INDEX idx_old_index,
    ALGORITHM=INPLACE, LOCK=NONE;
```

## Monitoring Online DDL Progress

MySQL 8.0 exposes DDL progress through `performance_schema`:

```sql
-- Check DDL progress
SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED,
       ROUND(WORK_COMPLETED / WORK_ESTIMATED * 100, 2) AS pct_done
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE '%alter%';
```

For long-running operations, you can also check:

```bash
# Watch disk space usage during rebuild
watch -n5 'df -h /var/lib/mysql'
```

## Handling Large Tables Safely

For very large tables, online DDL still requires extra disk space for the sort buffer and temporary files:

```sql
-- Check available space in the tmpdir
SHOW VARIABLES LIKE 'tmpdir';
```

To use a different temp directory, set `tmpdir` in the MySQL configuration file and restart the server, as `tmpdir` is a read-only variable:

```text
[mysqld]
tmpdir=/mnt/large-disk/tmp
```

The online DDL sort buffer is controlled by `innodb_sort_buffer_size` (default 1MB). Increasing it can speed up index builds:

```text
[mysqld]
innodb_sort_buffer_size=64M
```

## Combining Multiple Changes

Batch multiple changes into a single `ALTER TABLE` to minimize rebuilds:

```sql
-- Do all changes in one statement = one table rebuild
ALTER TABLE customers
    ADD COLUMN loyalty_tier ENUM('bronze','silver','gold') DEFAULT 'bronze',
    ADD COLUMN referral_code VARCHAR(20),
    ADD INDEX idx_loyalty (loyalty_tier),
    ALGORITHM=INPLACE, LOCK=NONE;
```

## When to Use pt-online-schema-change Instead

For MySQL versions before 8.0 where INSTANT is unavailable, or for very large tables where even INPLACE DDL is risky, consider `pt-online-schema-change` from Percona Toolkit:

```bash
pt-online-schema-change \
    --alter "ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP" \
    --execute \
    D=mydb,t=orders
```

## Summary

InnoDB online DDL minimizes table lock time during schema changes. Use `ALGORITHM=INSTANT` for metadata-only changes (MySQL 8.0+), `ALGORITHM=INPLACE, LOCK=NONE` for index builds and most structural changes, and batch multiple changes in one `ALTER TABLE` statement. Monitor progress via `performance_schema.events_stages_current` and ensure sufficient disk space for the operation.
