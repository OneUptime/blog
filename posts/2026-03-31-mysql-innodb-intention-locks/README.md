# How to Understand Intention Locks in MySQL InnoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: Understand how InnoDB intention locks work in MySQL, why they are needed, and how they coordinate table-level and row-level locking.

---

## What Are Intention Locks?

Intention locks are table-level locks in InnoDB that indicate a transaction intends to acquire row-level locks on rows within a table. They exist to make it efficient for InnoDB to determine whether a table-level lock (like LOCK TABLES) can be granted without scanning every row for existing row locks.

There are two types:

- IS (Intention Shared) - indicates the transaction will acquire shared (S) locks on rows
- IX (Intention Exclusive) - indicates the transaction will acquire exclusive (X) locks on rows

## How Intention Locks Are Acquired

Intention locks are acquired automatically before row-level locks:

```sql
-- Acquiring an S row lock also places an IS lock on the table
SELECT * FROM orders WHERE id = 5 LOCK IN SHARE MODE;
-- IS lock placed on orders table, then S lock on row 5

-- Acquiring an X row lock also places an IX lock on the table
SELECT * FROM orders WHERE id = 5 FOR UPDATE;
-- IX lock placed on orders table, then X lock on row 5

-- DML also acquires IX first
UPDATE orders SET status = 'shipped' WHERE id = 5;
-- IX lock on orders table, X lock on row 5
```

You never manually request intention locks - InnoDB handles them automatically.

## Compatibility Matrix

Intention locks are compatible with each other but conflict with full table locks:

```text
         IS    IX    S     X
IS       OK    OK    OK    NO
IX       OK    OK    NO    NO
S        OK    NO    OK    NO
X        NO    NO    NO    NO
```

IS and IX are compatible with each other - multiple transactions can simultaneously hold IS or IX on the same table. They only conflict with full S or X table locks.

## Why Intention Locks Are Efficient

Without intention locks, checking if a table-level lock can be granted would require scanning every row:

```sql
-- Efficient check using intention locks
LOCK TABLES orders READ;
-- InnoDB checks if any IX lock exists on orders table
-- If yes: blocked (a transaction holds exclusive row locks)
-- If no: immediately granted
-- No row scanning needed!
```

## Viewing Intention Locks

```sql
SELECT
    OBJECT_NAME AS table_name,
    LOCK_TYPE,
    LOCK_MODE,
    LOCK_STATUS
FROM performance_schema.data_locks
WHERE LOCK_TYPE = 'TABLE';
```

TABLE-level entries with LOCK_MODE of `IS` or `IX` are intention locks.

## Intention Locks in Practice

```sql
-- Session 1: Updating a row acquires IX on the table
START TRANSACTION;
UPDATE orders SET status = 'processing' WHERE id = 101;
-- orders table has IX lock, row 101 has X lock

-- Session 2: LOCK TABLES READ requires S on the table
-- S conflicts with IX, so this blocks
LOCK TABLES orders READ;
-- Waits for Session 1 to commit

-- Session 3: Another row update is fine
START TRANSACTION;
UPDATE orders SET status = 'processing' WHERE id = 202;
-- IX is compatible with IX - proceeds without blocking
```

## Intention Locks and LOCK TABLES

```sql
-- Check if a table lock is waiting due to intention locks
SELECT
    w.REQUESTING_ENGINE_TRANSACTION_ID AS waiting_trx,
    w.BLOCKING_ENGINE_TRANSACTION_ID AS blocking_trx,
    t.trx_query AS waiting_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.INNODB_TRX t
    ON t.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Summary

Intention locks are table-level markers that InnoDB uses to efficiently coordinate between row-level and table-level locking. They are acquired automatically before row locks and allow InnoDB to quickly reject conflicting table-level lock requests without row-by-row inspection. Understanding them helps explain why LOCK TABLES can block even when your application only uses row-level DML operations.
