# How MySQL Handles Concurrent Transactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, InnoDB, Concurrency, Lock

Description: Learn how MySQL InnoDB handles concurrent transactions using row-level locking, MVCC, isolation levels, and deadlock detection to ensure data consistency.

---

## The Challenge of Concurrency

When multiple transactions run simultaneously, they can conflict in three ways: reading data another transaction is modifying, modifying data another transaction is reading, or both modifying the same row. InnoDB addresses these with a combination of row-level locks and Multi-Version Concurrency Control (MVCC).

## Row-Level Locking

InnoDB locks individual rows rather than entire tables for most operations. Three lock types are fundamental:

- **Shared lock (S)**: allows reads; blocks writes from other transactions
- **Exclusive lock (X)**: blocks both reads and writes from other transactions
- **Intention locks (IS, IX)**: table-level indicators that row locks exist

```sql
-- Acquire a shared lock
SELECT * FROM orders WHERE id = 100 LOCK IN SHARE MODE;

-- Acquire an exclusive lock
SELECT * FROM orders WHERE id = 100 FOR UPDATE;
```

## MVCC for Non-Blocking Reads

For regular `SELECT` (without `LOCK IN SHARE MODE` or `FOR UPDATE`), InnoDB uses MVCC to serve consistent reads from a snapshot without acquiring locks. Readers and writers do not block each other:

```sql
-- Transaction A starts a consistent read snapshot
START TRANSACTION;
SELECT * FROM accounts WHERE id = 1;  -- Reads from snapshot, no lock
-- Transaction B can still modify accounts concurrently
COMMIT;
```

## Isolation Levels

The isolation level controls how much of other transactions' changes a transaction sees:

```sql
SHOW VARIABLES LIKE 'transaction_isolation';
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

| Isolation Level  | Dirty Read | Non-Repeatable Read | Phantom Read |
|------------------|------------|---------------------|--------------|
| READ UNCOMMITTED | Yes        | Yes                 | Yes          |
| READ COMMITTED   | No         | Yes                 | Yes          |
| REPEATABLE READ  | No         | No                  | No*          |
| SERIALIZABLE     | No         | No                  | No           |

*InnoDB prevents phantom reads in REPEATABLE READ using gap locks.

## Gap Locks and Next-Key Locks

To prevent phantom reads, InnoDB uses gap locks: locks on the gap between index records. A next-key lock covers a record and the gap before it:

```sql
-- This acquires a next-key lock covering the range (10, 20]
SELECT * FROM orders WHERE status_id BETWEEN 10 AND 20 FOR UPDATE;
```

Gap locks can cause deadlocks in concurrent INSERT scenarios. If phantom reads are not a concern, use `READ COMMITTED` to disable gap locking.

## Deadlock Detection and Resolution

InnoDB automatically detects deadlocks by maintaining a wait-for graph. When a cycle is detected, InnoDB rolls back the transaction with the least undo log (usually the smaller transaction):

```text
ERROR 1213 (40001): Deadlock found when trying to get lock; try restarting transaction
```

View the last deadlock details:

```sql
SHOW ENGINE INNODB STATUS\G
-- Look for the LATEST DETECTED DEADLOCK section
```

To minimize deadlocks:
- Access tables and rows in the same order across transactions
- Keep transactions short
- Use `SELECT ... FOR UPDATE` consistently rather than a mix of lock types

## Monitoring Lock Waits

```sql
SELECT
  r.trx_id         AS waiting_id,
  b.trx_id         AS blocking_id,
  r.trx_query      AS waiting_query,
  b.trx_query      AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.INNODB_TRX r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID
JOIN information_schema.INNODB_TRX b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID;
```

## Summary

MySQL InnoDB handles concurrent transactions through row-level locking combined with MVCC for non-blocking reads. The isolation level determines how much concurrent change is visible. Gap locks prevent phantom reads at REPEATABLE READ. InnoDB automatically resolves deadlocks by rolling back the least-expensive transaction. Keep transactions small, use consistent lock ordering, and choose isolation levels that match the consistency requirements of each use case.
