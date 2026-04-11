# What Is a Record Lock in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Record Lock, InnoDB, Row-Level Locking, Transaction, Concurrency

Description: Learn what a MySQL InnoDB record lock is, how it differs from table locks, and how to identify and resolve record lock contention.

---

## What Is a Record Lock

A record lock is an InnoDB lock placed on a single index record (row). It is the most granular lock type in MySQL - it locks exactly one row in an index, preventing other transactions from modifying or (with certain lock types) reading that row.

When documentation refers to "row-level locking," it means record locks. InnoDB always locks index records, not the physical row data directly. This is why every InnoDB table must have a primary key - if none is defined, InnoDB creates a hidden 6-byte rowid column to serve as the clustered index.

## Types of Record Locks

InnoDB uses two types of record locks:

**Shared lock (S lock)**: Multiple transactions can hold shared locks on the same row simultaneously. A shared lock allows reading the row but prevents other transactions from acquiring an exclusive lock.

**Exclusive lock (X lock)**: Only one transaction can hold an exclusive lock on a row at a time. It prevents other transactions from reading (with lock) or writing the row.

```sql
-- Acquire a shared record lock
SELECT * FROM accounts WHERE id = 42 FOR SHARE;

-- Acquire an exclusive record lock
SELECT * FROM accounts WHERE id = 42 FOR UPDATE;
```

## When Record Locks Are Acquired

InnoDB automatically acquires exclusive record locks on rows modified by DML:

```sql
-- Exclusive lock acquired on row id=42
UPDATE accounts SET balance = 500 WHERE id = 42;

-- Exclusive lock acquired on deleted row
DELETE FROM accounts WHERE id = 42;

-- Exclusive lock on newly inserted row
INSERT INTO accounts (id, owner, balance) VALUES (43, 'Alice', 1000);
```

Shared locks are acquired explicitly with `FOR SHARE` or implicitly in some scenarios:

```sql
-- Shared lock on all rows read during a foreign key check
-- (InnoDB acquires S locks on parent table rows during child table INSERT)
```

## Record Locks on Non-Unique Indexes

For an exact match on a unique index, InnoDB acquires only a record lock:

```sql
-- Unique index (id is PRIMARY KEY) - record lock only
SELECT * FROM accounts WHERE id = 42 FOR UPDATE;
```

For non-unique indexes, InnoDB uses next-key locks (record lock + gap lock) by default at REPEATABLE READ to prevent phantoms. To get only a record lock without the gap component on a non-unique index, use READ COMMITTED isolation:

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT * FROM accounts WHERE owner = 'Alice' FOR UPDATE;
```

## Detecting Record Locks

View active record locks in the Performance Schema:

```sql
SELECT
  ENGINE_LOCK_ID,
  ENGINE_TRANSACTION_ID,
  THREAD_ID,
  LOCK_TYPE,
  LOCK_MODE,
  LOCK_STATUS,
  LOCK_DATA
FROM performance_schema.data_locks
WHERE LOCK_TYPE = 'RECORD'
ORDER BY ENGINE_TRANSACTION_ID;
```

View lock waits (who is blocking whom):

```sql
SELECT
  r.trx_id waiting_trx_id,
  r.trx_mysql_thread_id waiting_thread,
  r.trx_query waiting_query,
  b.trx_id blocking_trx_id,
  b.trx_mysql_thread_id blocking_thread,
  b.trx_query blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Record Locks and Deadlocks

When two transactions each hold a record lock the other needs, a deadlock occurs:

```sql
-- Session 1:
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- X lock on id=1
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Waiting for X lock on id=2

-- Session 2 (concurrent):
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;   -- X lock on id=2
UPDATE accounts SET balance = balance + 50 WHERE id = 1;   -- Waiting for X lock on id=1
-- DEADLOCK!
```

InnoDB automatically detects deadlocks and rolls back the transaction with the least amount of work. Always access rows in the same order across transactions to prevent deadlocks.

## Lock Wait Timeout

If a transaction waits too long for a record lock, it fails with an error:

```sql
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
-- Default: 50 seconds
```

Adjust the timeout:

```sql
SET SESSION innodb_lock_wait_timeout = 10;
```

## Checking Lock Status via InnoDB Status

```sql
SHOW ENGINE INNODB STATUS\G
```

In the `TRANSACTIONS` section, find lock information:

```text
RECORD LOCKS space id 45 page no 3 n bits 72 index PRIMARY of table myapp.accounts
trx id 12345 lock_mode X locks rec but not gap
```

The phrase "locks rec but not gap" means this is a pure record lock with no gap component - typically from a unique index exact match or READ COMMITTED isolation.

## Summary

A record lock is an InnoDB lock on a single index row. Shared record locks allow concurrent reads but block exclusive locks. Exclusive record locks block both reads (with locking) and writes from other transactions. InnoDB acquires record locks automatically on all rows modified by DML statements and on rows accessed with SELECT ... FOR UPDATE or FOR SHARE. Detecting record lock contention through the Performance Schema helps diagnose slow queries and deadlocks in concurrent workloads.
