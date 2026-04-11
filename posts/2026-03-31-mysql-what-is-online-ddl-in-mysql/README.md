# What Is Online DDL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Online DDL, ALTER TABLE, Schema Change

Description: Online DDL in MySQL allows schema changes like adding indexes or columns to run concurrently with normal read and write operations, minimizing downtime.

---

## Overview

Online DDL (Data Definition Language) is a MySQL InnoDB feature that enables many `ALTER TABLE` operations to proceed while the table remains available for concurrent reads and writes. Without Online DDL, a table lock would block all queries for the duration of the operation.

Online DDL was progressively improved across MySQL versions, with MySQL 8.0 offering the widest range of lock-free operations.

## The ALGORITHM and LOCK Clauses

Every `ALTER TABLE` statement supports `ALGORITHM` and `LOCK` options:

```sql
ALTER TABLE orders
ADD INDEX idx_status (status),
ALGORITHM = INPLACE,
LOCK = NONE;
```

### ALGORITHM Options

| Algorithm | Behavior |
|-----------|----------|
| `INSTANT` | No table rebuild; only metadata changes (fastest) |
| `INPLACE` | Rebuilds index/table in-place without copying |
| `COPY` | Creates a copy of the table (blocks writes) |
| `DEFAULT` | MySQL picks the best available |

### LOCK Options

| Lock | Behavior |
|------|----------|
| `NONE` | No locking - concurrent reads and writes allowed |
| `SHARED` | Reads allowed, writes blocked |
| `EXCLUSIVE` | All queries blocked |
| `DEFAULT` | MySQL uses the least restrictive lock available |

## Checking What's Supported

```sql
-- Try with LOCK=NONE; if it fails, it requires locking
ALTER TABLE big_table ADD COLUMN notes TEXT, ALGORITHM=INSTANT, LOCK=NONE;
```

If the operation doesn't support `LOCK=NONE`, MySQL returns an error rather than silently locking the table.

## Common Online DDL Operations

### Adding an Index (INPLACE, LOCK=NONE)

```sql
ALTER TABLE orders
ADD INDEX idx_customer_status (customer_id, status),
ALGORITHM = INPLACE,
LOCK = NONE;
```

### Adding a Column (INSTANT in MySQL 8.0)

```sql
-- Available with INSTANT since MySQL 8.0.29 for most cases
ALTER TABLE users
ADD COLUMN last_login DATETIME NULL,
ALGORITHM = INSTANT;
```

### Renaming a Column (INSTANT in MySQL 8.0.28+)

```sql
-- Available with INSTANT since MySQL 8.0.28
ALTER TABLE products
RENAME COLUMN product_name TO name,
ALGORITHM = INSTANT;
```

### Changing Column Type (Requires COPY)

```sql
-- Type changes usually require a full table copy
ALTER TABLE events
MODIFY COLUMN event_data JSON,
ALGORITHM = COPY;  -- Will lock the table
```

## Operations and Their Default Algorithms

| Operation | Algorithm | Lock |
|-----------|-----------|------|
| Add/drop secondary index | INPLACE | NONE |
| Add column | INSTANT (8.0.29+) | NONE |
| Drop column | INSTANT (8.0.29+) | NONE |
| Rename column | INSTANT (8.0.28+) | NONE |
| Change column type | COPY | SHARED |
| Add FULLTEXT index | INPLACE | SHARED |
| Add FOREIGN KEY | INPLACE (if foreign_key_checks=0) | NONE |

## Monitoring Online DDL Progress

```sql
-- Monitor long-running ALTER TABLE
SELECT
  EVENT_NAME,
  WORK_COMPLETED,
  WORK_ESTIMATED,
  ROUND(WORK_COMPLETED / WORK_ESTIMATED * 100, 1) AS pct_complete
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE 'stage/innodb/alter%';
```

## Online DDL Phase Behavior

An INPLACE Online DDL goes through these phases:
1. **Initialization** - acquires a brief exclusive lock
2. **Execution** - runs concurrently with DML (changes tracked in a log)
3. **Commit** - brief exclusive lock to apply logged changes

The brief locks in phases 1 and 3 are typically milliseconds.

## Canceling an Online DDL

```sql
-- Find the thread ID of the ALTER
SHOW PROCESSLIST;

-- Kill it
KILL QUERY <thread_id>;
```

## Summary

Online DDL in MySQL enables schema changes to run without blocking the application by using INSTANT or INPLACE algorithms that allow concurrent reads and writes. Always specify `ALGORITHM` and `LOCK` explicitly to get a clear error rather than an unexpected table lock. For large tables, monitor progress through the Performance Schema and schedule DDL during low-traffic periods.
