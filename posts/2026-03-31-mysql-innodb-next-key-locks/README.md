# How to Understand Next-Key Locks in MySQL InnoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: Learn how next-key locks combine record and gap locks in MySQL InnoDB to prevent phantom reads and how to identify them.

---

## What Is a Next-Key Lock?

A next-key lock is the default locking strategy used by InnoDB under REPEATABLE READ. It is a combination of a record lock on an index entry plus a gap lock on the gap before that index entry. Next-key locks protect both the existing row and the space before it, preventing both modification of the row and insertion of new rows into the gap.

## Next-Key Lock Range

For an index containing values `10, 20, 30`, InnoDB defines these next-key lock intervals:

```text
(-infinity, 10]
(10, 20]
(20, 30]
(30, +infinity)
```

A query that locks the row with value `20` also locks the gap `(10, 20]`.

## Observing Next-Key Locks

```sql
-- Create a sample table
CREATE TABLE scores (
    id INT PRIMARY KEY,
    value INT,
    INDEX idx_value (value)
);

INSERT INTO scores VALUES (1, 10), (2, 20), (3, 30);

-- Session 1: Lock row where value = 20
START TRANSACTION;
SELECT * FROM scores WHERE value = 20 FOR UPDATE;
```

```sql
-- Session 2: Blocked - cannot insert in the gap (10, 20]
INSERT INTO scores (id, value) VALUES (4, 15);
-- Waits for Session 1 to commit
```

```sql
-- Inspect active locks
SELECT LOCK_MODE, LOCK_TYPE, LOCK_DATA
FROM performance_schema.data_locks;
-- Shows: X (next-key lock on secondary index), X,GAP (gap lock after range), X,REC_NOT_GAP (record lock on primary key)
```

## Next-Key Locks and Range Queries

Range queries acquire next-key locks across the entire scanned range:

```sql
START TRANSACTION;
SELECT * FROM scores WHERE value BETWEEN 10 AND 30 FOR UPDATE;
-- Acquires next-key locks on (negative infinity, 10], (10, 20], (20, 30], and gap lock on (30, +infinity)
```

This blocks any insert into the index until the transaction completes, since the locked ranges span from negative infinity through positive infinity.

## Difference from Gap and Record Locks

```sql
-- Record lock only (exact primary key, no gap)
SELECT * FROM scores WHERE id = 2 FOR UPDATE;
-- Only locks the row with id=2, no gap protection

-- Gap lock only (between two values, no record)
-- Acquired when scanning a range with no matching rows

-- Next-key lock (default for range or non-unique index scans)
SELECT * FROM scores WHERE value = 20 FOR UPDATE;
-- Locks both the row AND the preceding gap
```

## Reducing Next-Key Lock Scope

Use primary key lookups to avoid next-key locks when exact record locking is sufficient:

```sql
-- Efficient: record lock only on primary key
SELECT * FROM scores WHERE id = 2 FOR UPDATE;

-- Less efficient: next-key lock on secondary index scan
SELECT * FROM scores WHERE value = 20 FOR UPDATE;
```

Under READ COMMITTED, next-key locks are not used - only record locks on matched rows:

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT * FROM scores WHERE value = 20 FOR UPDATE;
-- Only acquires a record lock, no gap protection
```

## Why Next-Key Locks Cause Deadlocks

Two transactions acquiring next-key locks on overlapping ranges can deadlock:

```sql
-- Session 1 locks (10, 20] and tries to insert into (20, 30]
-- Session 2 locks (20, 30] and tries to insert into (10, 20]
-- Circular wait: deadlock

SHOW ENGINE INNODB STATUS\G
-- Look for LATEST DETECTED DEADLOCK section
```

## Summary

Next-key locks are InnoDB's default locking mechanism under REPEATABLE READ, combining record locks with gap locks to prevent both row modification and phantom inserts. They are automatically acquired during range and secondary index scans. Switching to READ COMMITTED or using primary key lookups can reduce their scope when full phantom prevention is not required.
