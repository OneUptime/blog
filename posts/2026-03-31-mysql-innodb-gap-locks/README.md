# How to Understand Gap Locks in MySQL InnoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: Understand how gap locks work in MySQL InnoDB, why they exist, how they prevent phantom reads, and when they cause unexpected blocking.

---

## What Is a Gap Lock?

A gap lock in InnoDB is a lock placed on the gap between two index values - not on an index record itself. Gap locks prevent other transactions from inserting new rows into the locked gap. They are a key mechanism for preventing phantom reads under the REPEATABLE READ isolation level.

## Why Gap Locks Exist

Without gap locks, a second read within the same transaction might see new rows ("phantoms") inserted by another committed transaction:

```sql
-- Without gap locks: phantom read scenario
START TRANSACTION;
SELECT * FROM orders WHERE amount BETWEEN 100 AND 200;
-- Returns 3 rows

-- Another session inserts: INSERT INTO orders (amount) VALUES (150);
-- Then commits.

SELECT * FROM orders WHERE amount BETWEEN 100 AND 200;
-- Without gap lock: returns 4 rows - a phantom!
```

Gap locks block that insert until the first transaction completes.

## Demonstrating a Gap Lock

```sql
-- Session 1: Acquires a gap lock on the range (100, 200)
START TRANSACTION;
SELECT * FROM orders WHERE amount BETWEEN 100 AND 200 FOR UPDATE;
```

```sql
-- Session 2: This INSERT is blocked because 150 falls in the locked gap
INSERT INTO orders (amount, customer_id) VALUES (150, 42);
-- Waits until Session 1 commits or rolls back
```

## Checking Gap Locks in Performance Schema

```sql
SELECT
    ENGINE_LOCK_ID,
    LOCK_TYPE,
    LOCK_MODE,
    LOCK_STATUS,
    LOCK_DATA
FROM performance_schema.data_locks
WHERE LOCK_TYPE = 'RECORD'
  AND LOCK_MODE LIKE '%GAP%';
```

A LOCK_MODE of `X,GAP` indicates an exclusive gap lock.

## Gap Locks and Isolation Levels

Gap locks are only used under REPEATABLE READ and SERIALIZABLE:

```sql
-- Under READ COMMITTED: gap locks are NOT used
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT * FROM orders WHERE amount BETWEEN 100 AND 200 FOR UPDATE;
-- Only record locks on existing rows, no gap lock
COMMIT;
```

Switching to READ COMMITTED eliminates gap locks and can resolve blocking issues caused by range queries.

## Gap Locks Are Not Exclusive Between Readers

Two transactions can hold gap locks on the same gap simultaneously - gap locks are compatible with each other:

```sql
-- Assume the orders table has an index on amount,
-- and no rows exist with amount between 100 and 200.

-- Session 1
START TRANSACTION;
SELECT * FROM orders WHERE amount = 150 FOR UPDATE;
-- No matching row; acquires a gap lock only

-- Session 2
START TRANSACTION;
SELECT * FROM orders WHERE amount = 160 FOR UPDATE;
-- No matching row; acquires a gap lock on the same gap
-- Both sessions hold gap locks; neither blocks the other
```

Gap locks only block INSERTs into that gap, not other gap locks. Note that if matching rows exist, `FOR UPDATE` acquires next-key locks (record lock plus gap lock), and the record lock component will block between sessions.

## Disabling Gap Locks

You can effectively disable gap locks by using READ COMMITTED:

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

Or by using exact primary key lookups which only acquire record locks:

```sql
-- Primary key lookup: record lock only, no gap lock
SELECT * FROM orders WHERE id = 101 FOR UPDATE;
```

## Summary

Gap locks in InnoDB protect index gaps from inserts to prevent phantom reads under REPEATABLE READ and SERIALIZABLE isolation levels. They are compatible between readers but block writers, and can be eliminated by switching to READ COMMITTED or using exact primary key lookups. Understanding gap locks is essential for diagnosing unexpected blocking in range queries.
