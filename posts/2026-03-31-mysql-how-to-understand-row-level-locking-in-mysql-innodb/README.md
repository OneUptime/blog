# How to Understand Row-Level Locking in MySQL InnoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Row Locking, Concurrency, Database Performance

Description: Learn how InnoDB row-level locking works, the types of locks used, and how to diagnose and resolve locking issues in MySQL.

---

## What Is Row-Level Locking in InnoDB?

InnoDB is MySQL's default storage engine and it implements row-level locking, which allows multiple transactions to read and write to different rows simultaneously without blocking each other. Unlike table-level locking (used by MyISAM), row-level locking enables much higher concurrency for OLTP workloads.

Row-level locking is managed internally by InnoDB and is not something you explicitly request - instead, it is applied automatically based on the SQL statements you execute within a transaction.

## Types of Locks in InnoDB

InnoDB uses several distinct lock types at the row level:

**Shared Lock (S Lock):** Allows a transaction to read a row. Multiple transactions can hold a shared lock on the same row simultaneously.

**Exclusive Lock (X Lock):** Allows a transaction to update or delete a row. Only one transaction can hold an exclusive lock on a row at a time.

**Intention Locks:** Table-level locks that indicate what type of row lock a transaction intends to acquire. These are `IS` (Intention Shared) and `IX` (Intention Exclusive).

**Record Lock:** A lock on a single index record.

**Gap Lock:** A lock on a gap between index records, preventing phantom reads.

**Next-Key Lock:** A combination of a record lock and a gap lock on the gap before the record.

## How Locks Are Acquired

```sql
-- Shared lock acquired by SELECT ... FOR SHARE (or LOCK IN SHARE MODE)
START TRANSACTION;
SELECT * FROM orders WHERE order_id = 101 FOR SHARE;

-- Exclusive lock acquired by SELECT ... FOR UPDATE
START TRANSACTION;
SELECT * FROM orders WHERE order_id = 101 FOR UPDATE;

-- Exclusive locks also acquired automatically by DML
START TRANSACTION;
UPDATE orders SET status = 'shipped' WHERE order_id = 101;
```

InnoDB always locks at the index level. If no index is present on the column used in the WHERE clause, InnoDB falls back to locking the clustered index (primary key), which can inadvertently lock more rows.

## Understanding Next-Key Locks and Phantom Reads

By default, InnoDB runs at the `REPEATABLE READ` isolation level and uses next-key locks to prevent phantom reads.

```sql
-- Session 1: range scan acquires next-key locks
START TRANSACTION;
SELECT * FROM products WHERE price BETWEEN 10 AND 50 FOR UPDATE;

-- Session 2: this INSERT will be blocked because the gap is locked
INSERT INTO products (name, price) VALUES ('Widget', 25);
```

The gap lock prevents Session 2 from inserting a row that would have appeared in Session 1's range query.

## Checking Lock Activity

Use the `information_schema` or `performance_schema` to inspect current lock waits.

For MySQL 5.7 and earlier, use the `information_schema.innodb_lock_waits` table (removed in MySQL 8.0):

```sql
-- View current lock waits (MySQL 5.7 and earlier)
SELECT
  r.trx_id AS waiting_trx_id,
  r.trx_mysql_thread_id AS waiting_thread,
  r.trx_query AS waiting_query,
  b.trx_id AS blocking_trx_id,
  b.trx_mysql_thread_id AS blocking_thread,
  b.trx_query AS blocking_query
FROM information_schema.innodb_lock_waits w
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id;
```

For MySQL 8.0+, use the `sys.innodb_lock_waits` view (which wraps `performance_schema` tables):

```sql
SELECT
  waiting_pid,
  waiting_query,
  blocking_pid,
  blocking_query,
  wait_age,
  locked_table,
  locked_index
FROM sys.innodb_lock_waits;
```

## Viewing Lock Details with SHOW ENGINE INNODB STATUS

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `TRANSACTIONS` section in the output. It lists active transactions, lock waits, and which rows are locked. Example output:

```text
---TRANSACTION 12345, ACTIVE 5 sec starting index read
MySQL thread id 10, OS thread handle 140234, query id 88 localhost root
UPDATE orders SET status = 'shipped' WHERE order_id = 101
------- TRX HAS BEEN WAITING 5 SEC FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 23 page no 4 n bits 72 index PRIMARY of table `shop`.`orders`
```

## Common Locking Pitfalls

**No index on the filter column:** Without an index, InnoDB may scan and lock every row in the table.

```sql
-- BAD: locks all rows if no index on `status`
UPDATE orders SET processed = 1 WHERE status = 'pending';

-- GOOD: add an index
ALTER TABLE orders ADD INDEX idx_status (status);
```

**Long-running transactions:** The longer a transaction holds locks, the more likely it is to block other sessions.

```sql
-- Check for long-running transactions
SELECT trx_id, trx_started, trx_query, trx_rows_locked
FROM information_schema.innodb_trx
ORDER BY trx_started ASC;
```

**Using SELECT without FOR UPDATE when update follows:** This two-step pattern can lead to race conditions.

```sql
-- PROBLEMATIC pattern
START TRANSACTION;
SELECT stock FROM inventory WHERE product_id = 5;
-- another transaction may modify stock here
UPDATE inventory SET stock = stock - 1 WHERE product_id = 5;
COMMIT;

-- SAFER pattern
START TRANSACTION;
SELECT stock FROM inventory WHERE product_id = 5 FOR UPDATE;
UPDATE inventory SET stock = stock - 1 WHERE product_id = 5;
COMMIT;
```

## Reducing Lock Contention

- Keep transactions short - commit as quickly as possible.
- Access rows in a consistent order to avoid deadlocks.
- Use proper indexes to minimize the number of rows locked.
- Consider using `READ COMMITTED` isolation level where phantom reads are acceptable, as it does not use gap locks.

```sql
-- Set isolation level for a session
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Summary

InnoDB row-level locking is a core mechanism that enables high-concurrency access to MySQL tables. It uses record locks, gap locks, and next-key locks to protect data integrity while allowing parallel transactions. Monitoring lock waits through `information_schema` and `sys` schema views helps identify bottlenecks, and following best practices like keeping transactions short and using proper indexes reduces contention significantly.
