# How to Understand Shared and Exclusive Locks in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Locking, InnoDB, Concurrency, Transaction

Description: Learn how MySQL InnoDB shared and exclusive locks work, how they interact, and how to use SELECT FOR SHARE and SELECT FOR UPDATE in transactions.

---

## Overview

MySQL InnoDB uses two fundamental lock modes for row-level locking: shared (S) locks and exclusive (X) locks. Understanding how these locks interact is essential for writing correct concurrent transactions and diagnosing lock contention issues.

## Lock Compatibility Matrix

The core rule is simple:

```text
              | Shared (S) | Exclusive (X)
Shared (S)    |  COMPATIBLE |  CONFLICT
Exclusive (X) |  CONFLICT   |  CONFLICT
```

Multiple transactions can hold shared locks on the same row simultaneously. An exclusive lock requires that no other transaction holds any lock on the row.

## Shared Locks (SELECT ... FOR SHARE)

A shared lock allows a transaction to read a row while preventing other transactions from modifying it:

```sql
-- Transaction A: Acquire shared lock on a row
START TRANSACTION;
SELECT balance
FROM accounts
WHERE account_id = 42
FOR SHARE;

-- While Transaction A holds the lock:
-- Transaction B can also read with FOR SHARE (compatible)
-- Transaction B CANNOT run UPDATE or DELETE (blocked until A commits)
```

The older syntax `LOCK IN SHARE MODE` is equivalent:

```sql
SELECT balance FROM accounts WHERE account_id = 42 LOCK IN SHARE MODE;
```

## Exclusive Locks (SELECT ... FOR UPDATE)

An exclusive lock prevents other transactions from reading (with locking reads) or modifying the locked rows:

```sql
-- Transaction A: Acquire exclusive lock
START TRANSACTION;
SELECT balance
FROM accounts
WHERE account_id = 42
FOR UPDATE;

-- Update using the locked value
UPDATE accounts
SET balance = balance - 100
WHERE account_id = 42;

COMMIT;
```

`INSERT`, `UPDATE`, and `DELETE` statements automatically acquire exclusive locks on affected rows.

## Practical Example: Bank Transfer

The classic use case for explicit locking is a funds transfer that must read and then update balances atomically:

```sql
START TRANSACTION;

-- Lock both accounts to prevent concurrent modifications
SELECT account_id, balance
FROM accounts
WHERE account_id IN (101, 202)
ORDER BY account_id  -- Always lock in consistent order to prevent deadlocks
FOR UPDATE;

-- Perform the transfer
UPDATE accounts SET balance = balance - 500 WHERE account_id = 101;
UPDATE accounts SET balance = balance + 500 WHERE account_id = 202;

COMMIT;
```

## NOWAIT and SKIP LOCKED Options

MySQL 8.0 introduced options to avoid waiting for locks:

```sql
-- Fail immediately if the row is locked (instead of waiting)
SELECT * FROM orders WHERE id = 55 FOR UPDATE NOWAIT;

-- Skip locked rows (useful for job queue processing)
SELECT * FROM tasks
WHERE status = 'pending'
LIMIT 10
FOR UPDATE SKIP LOCKED;
```

`SKIP LOCKED` is particularly useful for implementing work queues where multiple workers process tasks concurrently:

```sql
-- Worker process: claim up to 5 unclaimed tasks
START TRANSACTION;

SELECT id, payload
FROM task_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 5
FOR UPDATE SKIP LOCKED;

UPDATE task_queue SET status = 'processing' WHERE id IN (/* ids from above */);

COMMIT;
```

## Viewing Active Locks

```sql
-- MySQL 8.0: View current row locks
SELECT
    engine_lock_id,
    engine_transaction_id,
    object_schema,
    object_name,
    lock_type,
    lock_mode,
    lock_status
FROM performance_schema.data_locks
WHERE lock_mode IN ('S', 'X', 'S,GAP', 'X,GAP', 'S,REC_NOT_GAP', 'X,REC_NOT_GAP');
```

## Summary

InnoDB shared locks (`FOR SHARE`) allow concurrent reads while blocking writes, making them suitable for read-then-conditional-write patterns. Exclusive locks (`FOR UPDATE`) block all other locking reads and writes, ensuring a transaction has exclusive access for read-modify-write operations. Use `NOWAIT` to avoid blocking when a lock cannot be immediately acquired, and `SKIP LOCKED` to implement non-blocking work queues. Always acquire locks in a consistent order across transactions to prevent deadlocks.
