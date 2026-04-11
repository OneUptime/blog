# How to Use SERIALIZABLE Isolation Level in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, Isolation, InnoDB, Concurrency

Description: Learn how SERIALIZABLE isolation level in MySQL provides the strongest consistency guarantees by converting reads to locking reads.

---

## What Is SERIALIZABLE?

SERIALIZABLE is the highest and strictest transaction isolation level in MySQL. Under this level, InnoDB automatically converts all plain SELECT statements into SELECT ... FOR SHARE, acquiring shared locks on every row read. Transactions appear to execute serially - one after another - even when they run concurrently.

## Setting SERIALIZABLE

```sql
-- Set for current session
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Set globally
SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

Verify:

```sql
SELECT @@transaction_isolation;
-- Returns: SERIALIZABLE
```

## How It Works

Under SERIALIZABLE, every read acquires a shared (S) lock, and every write acquires an exclusive (X) lock:

```sql
-- Session 1: SERIALIZABLE - plain SELECT acquires shared locks
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1;
-- InnoDB acquires a shared lock on this row
```

```sql
-- Session 2: Cannot modify the row until Session 1 commits
UPDATE accounts SET balance = 500 WHERE id = 1;
-- Blocks and waits for Session 1's shared lock to be released
```

## Phantom Read Prevention

Unlike REPEATABLE READ, SERIALIZABLE fully prevents phantom reads even for plain reads:

```sql
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;

-- This acquires a shared next-key lock on the entire range
SELECT * FROM orders WHERE amount > 1000;

-- No other session can insert an order with amount > 1000 until this commits

COMMIT;
```

## Performance Impact

SERIALIZABLE significantly increases lock contention. Benchmark comparison:

```sql
-- Check how many lock waits occur
SHOW STATUS LIKE 'Innodb_row_lock_waits';
SHOW STATUS LIKE 'Innodb_row_lock_time_avg';
```

In high-concurrency environments, SERIALIZABLE can cause:
- Increased lock wait times
- Higher deadlock frequency
- Reduced throughput

## When to Use SERIALIZABLE

SERIALIZABLE is appropriate for:

- Financial double-entry bookkeeping where consistency is critical
- Inventory systems that must prevent overselling
- Regulatory workloads requiring audit-grade consistency
- Small datasets or low-concurrency applications

```sql
-- Inventory reservation with full serialization guarantee
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;
START TRANSACTION;

SELECT quantity FROM inventory WHERE product_id = 42;
-- Guaranteed: no other session can modify this row until this transaction commits

UPDATE inventory SET quantity = quantity - 1 WHERE product_id = 42 AND quantity > 0;

-- Check ROW_COUNT() in your application code:
-- If 0 rows affected, ROLLBACK (item out of stock)
-- Otherwise, COMMIT
COMMIT;
```

## Deadlock Risk

Because SERIALIZABLE acquires shared locks on reads, deadlocks are more common:

```sql
-- Session 1
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1;  -- Acquires S lock on row 1

-- Session 2 simultaneously
START TRANSACTION;
SELECT * FROM accounts WHERE id = 2;  -- Acquires S lock on row 2

-- Session 1 tries to update row 2 - waits for Session 2's S lock
-- Session 2 tries to update row 1 - waits for Session 1's S lock
-- Result: DEADLOCK
```

Monitor deadlocks with:

```sql
SHOW ENGINE INNODB STATUS\G
```

## Summary

SERIALIZABLE provides the strongest consistency guarantees in MySQL by converting all reads to locking reads. This fully prevents dirty reads, non-repeatable reads, and phantom reads but at the cost of significant lock contention and reduced concurrency. Use it only when absolute data consistency is required and concurrency demands are manageable.
