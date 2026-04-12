# How to Understand Record Locks in MySQL InnoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: Learn what record locks are in MySQL InnoDB, how they differ from gap and next-key locks, and how to inspect them.

---

## What Is a Record Lock?

A record lock in InnoDB is a lock placed on a single index record. It prevents other transactions from inserting, updating, or deleting that specific row. Record locks are the most targeted type of InnoDB row lock - they protect exactly one row without affecting surrounding gaps.

## When Record Locks Are Acquired

Record locks are acquired during:

- DML statements (UPDATE, DELETE) on existing rows
- SELECT ... FOR UPDATE on a primary key
- SELECT ... LOCK IN SHARE MODE on a primary key

```sql
-- Acquire an exclusive record lock on the row with id = 5
SELECT * FROM orders WHERE id = 5 FOR UPDATE;

-- Acquire a shared record lock
SELECT * FROM orders WHERE id = 5 LOCK IN SHARE MODE;

-- DML automatically acquires exclusive record locks
UPDATE orders SET status = 'shipped' WHERE id = 5;
DELETE FROM orders WHERE id = 5;
```

## Record Locks on Primary Key vs Secondary Index

Record locks behave differently depending on which index is used:

```sql
CREATE TABLE products (
    id INT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    price DECIMAL(10,2),
    INDEX idx_price (price)
);

-- Primary key lookup: pure record lock, no gap lock
SELECT * FROM products WHERE id = 10 FOR UPDATE;

-- Unique index lookup: also results in a record lock (no gap)
SELECT * FROM products WHERE sku = 'ABC123' FOR UPDATE;

-- Non-unique index: acquires next-key locks (record + gap)
SELECT * FROM products WHERE price = 49.99 FOR UPDATE;
```

When the column used is the primary key or a unique index with an exact match, InnoDB uses a pure record lock without a gap component.

## Inspecting Record Locks

```sql
-- Show all current record locks
SELECT
    OBJECT_NAME AS table_name,
    LOCK_TYPE,
    LOCK_MODE,
    LOCK_STATUS,
    LOCK_DATA
FROM performance_schema.data_locks
WHERE LOCK_TYPE = 'RECORD';
```

The LOCK_MODE column shows:
- `X` - exclusive next-key lock (record + gap)
- `S` - shared next-key lock (record + gap)
- `X,REC_NOT_GAP` - exclusive record lock without gap component
- `S,REC_NOT_GAP` - shared record lock without gap component

## Shared vs Exclusive Record Locks

```sql
-- Shared record lock (S): multiple readers allowed, writers blocked
-- Session 1
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;

-- Session 2 - can also acquire shared lock
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1 LOCK IN SHARE MODE;
-- Succeeds - shared locks are compatible

-- Session 2 - cannot acquire exclusive lock
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- Waits for Session 1's shared lock to be released
```

## Record Lock Duration

Record locks are held for the lifetime of the transaction:

```sql
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- Lock is held here

-- Perform application logic...

COMMIT;
-- Lock released only now
```

Keep transactions short to minimize the time record locks are held.

## Record Locks and Deadlocks

Even pure record locks can deadlock:

```sql
-- Session 1 locks row id=1, then tries to lock id=2
-- Session 2 locks row id=2, then tries to lock id=1
-- Circular dependency: deadlock

-- Prevention: always access rows in the same order
```

## Summary

Record locks in InnoDB are the most precise type of row lock, protecting a single index entry without affecting surrounding gaps. They are acquired automatically during DML and locking reads on primary keys or unique indexes with exact matches. Keeping transactions short and accessing rows in a consistent order are the main strategies for avoiding record lock contention and deadlocks.
