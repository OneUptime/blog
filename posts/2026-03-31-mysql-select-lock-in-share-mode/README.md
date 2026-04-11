# How to Use SELECT ... LOCK IN SHARE MODE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: Learn how LOCK IN SHARE MODE acquires shared locks in MySQL, its practical use cases, and how it compares to the newer FOR SHARE syntax.

---

## What Is LOCK IN SHARE MODE?

`SELECT ... LOCK IN SHARE MODE` is a locking read that acquires shared (S) locks on all rows returned by the query. It allows other sessions to read the same rows concurrently but prevents any session from acquiring an exclusive lock (needed for UPDATE or DELETE) until the shared locks are released. This syntax has been available since MySQL 5 and remains supported in all versions.

## Basic Syntax

```sql
START TRANSACTION;
SELECT * FROM products WHERE category_id = 5 LOCK IN SHARE MODE;
-- Shared locks placed on all returned rows
COMMIT;
```

## Behavior with Concurrent Sessions

```sql
-- Session 1: Acquires shared locks
START TRANSACTION;
SELECT price FROM products WHERE id = 10 LOCK IN SHARE MODE;
-- Shared lock on row id=10
```

```sql
-- Session 2: Can also read with shared lock (compatible)
START TRANSACTION;
SELECT price FROM products WHERE id = 10 LOCK IN SHARE MODE;
-- Succeeds

-- Session 2 cannot modify the row
UPDATE products SET price = 59.99 WHERE id = 10;
-- Blocked - waits for Session 1's shared lock to be released
```

## Practical Example: Parent-Child Insert Integrity

A common use case is ensuring a parent row exists before inserting a dependent child row:

```sql
START TRANSACTION;

-- Lock the category to prevent concurrent deletion
SELECT id FROM categories WHERE id = 3 LOCK IN SHARE MODE;

-- If category exists, safely insert the product
INSERT INTO products (name, category_id, price)
VALUES ('New Widget', 3, 29.99);

COMMIT;
```

Without the lock, the category row could be deleted between the check and the insert (in highly concurrent environments).

## Difference Between LOCK IN SHARE MODE and FOR SHARE

Both acquire the same shared lock type. The key differences:

```sql
-- LOCK IN SHARE MODE (legacy, all MySQL versions)
SELECT * FROM orders WHERE id = 5 LOCK IN SHARE MODE;
-- Does not support NOWAIT or SKIP LOCKED

-- FOR SHARE (MySQL 8.0+, preferred)
SELECT * FROM orders WHERE id = 5 FOR SHARE;
SELECT * FROM orders WHERE id = 5 FOR SHARE NOWAIT;
SELECT * FROM orders WHERE id = 5 FOR SHARE SKIP LOCKED;
```

For MySQL 8.0 and later, prefer FOR SHARE for new code.

## Combining Multiple Tables

```sql
-- Lock rows in multiple tables within one query
START TRANSACTION;
SELECT o.id, c.name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.id = 100
LOCK IN SHARE MODE;
-- Shared locks acquired on both the orders row and the customers row
COMMIT;
```

## Checking Shared Locks

```sql
-- View shared locks in performance schema
SELECT
    OBJECT_NAME AS table_name,
    LOCK_MODE,
    LOCK_STATUS,
    LOCK_DATA
FROM performance_schema.data_locks
WHERE LOCK_MODE LIKE 'S%';
```

## Converting to Exclusive Lock

If you later need to modify a row you initially locked with LOCK IN SHARE MODE, the UPDATE will attempt to upgrade the shared lock to an exclusive lock. This succeeds only when no other session holds a shared lock on the same row:

```sql
-- Anti-pattern: trying to upgrade in the same session
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;
UPDATE accounts SET balance = 500 WHERE id = 1;
-- Works only if no other session holds a shared lock on this row
-- If another session also has LOCK IN SHARE MODE, this deadlocks
COMMIT;
```

The safest approach is to use FOR UPDATE directly if modification is the intent.

## Summary

`SELECT ... LOCK IN SHARE MODE` acquires shared locks on queried rows, allowing concurrent reads but blocking exclusive modifications until the transaction ends. It is the legacy syntax for shared locking reads in MySQL and works across all versions. For MySQL 8.0 and above, the equivalent `FOR SHARE` syntax is preferred as it supports NOWAIT and SKIP LOCKED options.
