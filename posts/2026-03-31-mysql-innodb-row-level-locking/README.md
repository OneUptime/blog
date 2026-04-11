# How to Understand InnoDB Row-Level Locking in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: A practical guide to InnoDB row-level locking in MySQL, covering lock types, how they are acquired, and how to monitor lock activity.

---

## What Is Row-Level Locking?

InnoDB implements row-level locking rather than table-level locking (as used by MyISAM). Row-level locking allows multiple transactions to read and write different rows simultaneously, dramatically improving concurrency. Locks are placed on index records, not on the physical rows themselves.

## Types of Row Locks

InnoDB supports four main categories of row-level locks:

- Record locks - lock on a single index record
- Gap locks - lock on a gap between index records
- Next-key locks - combination of record lock and gap lock
- Insert intention locks - special gap lock for INSERT operations

## Acquiring Row Locks

DML statements automatically acquire appropriate locks:

```sql
-- Exclusive (X) lock acquired automatically on updated rows
UPDATE orders SET status = 'shipped' WHERE id = 101;

-- Exclusive lock acquired on deleted row
DELETE FROM orders WHERE id = 202;

-- Shared (S) lock - manual locking read
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;

-- Exclusive lock - manual locking read
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
```

Regular SELECT statements without locking clauses do not acquire row locks - they use MVCC snapshots instead.

## How Locks Use Indexes

InnoDB locks work on index records. If a query has no usable index, InnoDB may lock every row in the table:

```sql
-- Creates a table with and without an index
CREATE TABLE orders (
    id INT PRIMARY KEY,
    customer_id INT,
    status VARCHAR(20),
    INDEX idx_customer (customer_id)
);

-- Uses the index - locks only matching rows
UPDATE orders SET status = 'cancelled' WHERE customer_id = 5;

-- No index on status - may lock all rows or cause table scan locking
UPDATE orders SET status = 'cancelled' WHERE status = 'pending';
```

Always ensure columns used in WHERE clauses of DML statements have indexes to avoid excessive locking.

## Monitoring Active Locks

Use the performance_schema to inspect current locks:

```sql
-- View current lock waits with actual blocking relationships
SELECT
    r.trx_id AS waiting_trx_id,
    r.trx_mysql_thread_id AS waiting_thread,
    b.trx_id AS blocking_trx_id,
    b.trx_mysql_thread_id AS blocking_thread
FROM performance_schema.data_lock_waits w
JOIN information_schema.INNODB_TRX r
    ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.INNODB_TRX b
    ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID;
```

```sql
-- Show detailed lock information
SELECT * FROM performance_schema.data_locks\G
```

## Lock Wait Statistics

```sql
-- Check lock wait frequency and duration
SHOW STATUS LIKE 'Innodb_row_lock_waits';
SHOW STATUS LIKE 'Innodb_row_lock_time_avg';
SHOW STATUS LIKE 'Innodb_row_lock_current_waits';
```

High values indicate lock contention and may require query optimization or isolation level changes.

## Reducing Lock Contention

Best practices for minimizing row lock contention:

```sql
-- Keep transactions short
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
-- Do NOT do long processing inside transactions

-- Access rows in a consistent order across transactions
-- Always lock id=1 before id=2 to prevent deadlocks

-- Use appropriate indexes to narrow lock scope
EXPLAIN SELECT * FROM orders WHERE customer_id = 5 FOR UPDATE;
```

## Summary

InnoDB row-level locking is the foundation of MySQL's concurrent transaction support. Locks are placed on index records, and the type of lock (record, gap, next-key) depends on the query and isolation level. Proper indexing, short transactions, and consistent lock ordering are key strategies for minimizing contention and deadlocks.
