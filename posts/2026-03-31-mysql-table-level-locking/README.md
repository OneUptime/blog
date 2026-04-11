# How to Understand Table-Level Locking in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Locking, Table Lock, Concurrency, MyISAM

Description: Understand how MySQL table-level locking works, which storage engines use it, when it causes contention, and how to minimize its impact on performance.

---

## Overview

Table-level locking is the coarsest MySQL locking granularity - a lock is placed on an entire table when data is accessed or modified. While InnoDB uses row-level locking for DML operations, table locks still appear in MySQL in several important scenarios.

## Storage Engines and Locking Granularity

Different storage engines use different locking strategies:

```sql
-- Check the storage engine for a table
SELECT table_name, engine
FROM information_schema.tables
WHERE table_schema = 'myapp';
```

```text
InnoDB  - Row-level locking for DML (INSERT, UPDATE, DELETE)
         - Table-level locks for DDL (ALTER TABLE, DROP TABLE)
MyISAM  - Table-level locking for all operations
MEMORY  - Table-level locking
MERGE   - Table-level locking
```

## Explicit Table Locks with LOCK TABLES

You can explicitly acquire table-level locks using `LOCK TABLES`:

```sql
-- Acquire a READ lock (allows concurrent reads, blocks writes)
LOCK TABLES orders READ;
SELECT COUNT(*) FROM orders;
UNLOCK TABLES;

-- Acquire a WRITE lock (blocks all other reads and writes)
LOCK TABLES orders WRITE, order_items WRITE;
UPDATE orders SET status = 'processed' WHERE id = 101;
DELETE FROM order_items WHERE order_id = 101;
UNLOCK TABLES;
```

When holding a `LOCK TABLES` lock, you can only access tables explicitly listed in the lock statement.

## Table Locks During DDL Operations

Even in InnoDB, DDL statements acquire metadata locks (a type of table lock):

```sql
-- This blocks all DML on the table until complete
ALTER TABLE orders ADD COLUMN notes TEXT;

-- Use online DDL to minimize impact (MySQL 5.6+)
ALTER TABLE orders
  ADD COLUMN notes TEXT,
  ALGORITHM=INPLACE,
  LOCK=NONE;
```

## Checking for Active Table Locks

```sql
-- Show active locks and waiting queries
SHOW OPEN TABLES WHERE In_use > 0;

-- Check for InnoDB lock waits (MySQL 8.0+)
SELECT
    r.trx_id AS waiting_trx,
    r.trx_mysql_thread_id AS waiting_thread,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx,
    b.trx_mysql_thread_id AS blocking_thread,
    b.trx_query AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Table Lock Statistics

```sql
-- Check table lock contention metrics
SHOW STATUS LIKE 'Table_locks%';
```

```text
Table_locks_immediate  - Locks acquired without waiting (higher is better)
Table_locks_waited     - Locks that had to wait (lower is better)
```

A high `Table_locks_waited` value indicates contention. Calculate the wait ratio:

```sql
SELECT
    (Table_locks_waited / (Table_locks_immediate + Table_locks_waited)) * 100
    AS lock_wait_pct
FROM (
    SELECT
        VARIABLE_VALUE AS Table_locks_waited
    FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Table_locks_waited'
) w,
(
    SELECT VARIABLE_VALUE AS Table_locks_immediate
    FROM performance_schema.global_status
    WHERE VARIABLE_NAME = 'Table_locks_immediate'
) i;
```

## Migrating from MyISAM to InnoDB

If high table lock contention comes from MyISAM tables, migrating to InnoDB dramatically reduces locking overhead:

```sql
-- Convert a MyISAM table to InnoDB
ALTER TABLE legacy_table ENGINE=InnoDB;

-- Verify the change
SELECT table_name, engine
FROM information_schema.tables
WHERE table_name = 'legacy_table';
```

## Summary

Table-level locking in MySQL most commonly affects MyISAM tables, where every DML operation locks the entire table. InnoDB uses row-level locks for DML but still acquires table-level metadata locks for DDL operations. Monitor `Table_locks_waited` to detect contention, use `ALGORITHM=INPLACE, LOCK=NONE` for online DDL where possible, and migrate MyISAM tables to InnoDB to benefit from row-level locking granularity.
