# How to Use SELECT ... FOR SHARE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: Learn how SELECT ... FOR SHARE acquires shared locks in MySQL 8.0, how it differs from LOCK IN SHARE MODE, and when to use it.

---

## What Is SELECT ... FOR SHARE?

`SELECT ... FOR SHARE` is a locking read introduced in MySQL 8.0 that acquires a shared (S) lock on the selected rows. Multiple transactions can hold shared locks on the same rows simultaneously, but no transaction can acquire an exclusive lock (to update or delete) on those rows until all shared locks are released. It is the modern syntax replacing `SELECT ... LOCK IN SHARE MODE`.

## Basic Syntax

```sql
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1 FOR SHARE;
-- Shared lock held - other readers are allowed, writers are blocked
COMMIT;
```

## FOR SHARE vs LOCK IN SHARE MODE

Both acquire the same type of shared lock, but FOR SHARE supports the newer NOWAIT and SKIP LOCKED options:

```sql
-- Legacy syntax (still valid)
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;

-- Modern syntax (MySQL 8.0+)
SELECT * FROM accounts WHERE id = 1 FOR SHARE;

-- Modern syntax with NOWAIT (not available with LOCK IN SHARE MODE)
SELECT * FROM accounts WHERE id = 1 FOR SHARE NOWAIT;
```

## Use Case: Validating a Foreign Key Before Insert

FOR SHARE is useful when you need to confirm a parent row exists before inserting a child row:

```sql
START TRANSACTION;

-- Lock the parent row to ensure it exists and is not deleted
SELECT * FROM customers WHERE id = 42 FOR SHARE;

-- Safe to insert the child row
INSERT INTO orders (customer_id, amount) VALUES (42, 99.99);

COMMIT;
```

Without the FOR SHARE lock, the customer row could be deleted between your check and the insert.

## Multiple Sessions with FOR SHARE

```sql
-- Session 1
START TRANSACTION;
SELECT * FROM products WHERE id = 10 FOR SHARE;

-- Session 2 - can also acquire a shared lock simultaneously
START TRANSACTION;
SELECT * FROM products WHERE id = 10 FOR SHARE;
-- Succeeds - shared locks are compatible
```

```sql
-- Session 3 - cannot acquire an exclusive lock
START TRANSACTION;
UPDATE products SET price = 99 WHERE id = 10;
-- Blocked - waits for both shared locks to be released
```

## NOWAIT and SKIP LOCKED Options

```sql
-- Return immediately if the row is locked
START TRANSACTION;
SELECT * FROM inventory WHERE product_id = 5 FOR SHARE NOWAIT;
-- Raises ERROR 3572 if another transaction holds an X lock

-- Skip locked rows
START TRANSACTION;
SELECT * FROM inventory
WHERE quantity > 0
FOR SHARE SKIP LOCKED;
-- Returns only rows not currently exclusively locked
COMMIT;
```

## Upgrading from Shared to Exclusive Lock

Within the same transaction, you can request an exclusive lock on a row you already hold a shared lock on. InnoDB will upgrade the lock if no other session holds a conflicting lock. However, if another session also holds a shared lock on the same row and both sessions try to upgrade, a deadlock occurs:

```sql
START TRANSACTION;

-- First check with shared lock
SELECT quantity FROM inventory WHERE product_id = 5 FOR SHARE;

-- Upgrade to exclusive lock in the same transaction
-- Succeeds if no other session holds an S lock on this row
-- Deadlocks if another session also holds an S lock and tries to upgrade
SELECT quantity FROM inventory WHERE product_id = 5 FOR UPDATE;

-- Better pattern: go directly to FOR UPDATE if you plan to modify
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 5;
COMMIT;
```

## Checking Active Shared Locks

```sql
SELECT LOCK_MODE, LOCK_TYPE, OBJECT_NAME, LOCK_DATA
FROM performance_schema.data_locks
WHERE LOCK_MODE IN ('S', 'S,REC_NOT_GAP');
```

## Summary

`SELECT ... FOR SHARE` acquires shared locks that allow concurrent reads while preventing exclusive modifications. It is the modern MySQL 8.0 replacement for LOCK IN SHARE MODE and supports NOWAIT and SKIP LOCKED options. Use it when you need to read rows and guarantee they will not be deleted or exclusively locked before your transaction acts on them.
