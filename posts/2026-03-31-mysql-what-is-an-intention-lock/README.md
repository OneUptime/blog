# What Is an Intention Lock in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Transaction, Concurrency

Description: An intention lock in MySQL InnoDB signals that a transaction intends to acquire row-level locks, enabling efficient table-level lock compatibility checks.

---

## Overview

An intention lock is a special type of table-level lock in MySQL InnoDB that indicates a transaction's intent to acquire row-level locks on one or more rows within a table. Rather than scanning every row to determine lock conflicts, MySQL uses intention locks to make compatibility decisions quickly at the table level.

There are two types of intention locks:

- **IS (Intention Shared)**: Signals that a transaction intends to set shared locks on individual rows.
- **IX (Intention Exclusive)**: Signals that a transaction intends to set exclusive locks on individual rows.

## Why Intention Locks Exist

Without intention locks, if a transaction wants to lock an entire table, MySQL would need to scan every row to verify no row-level locks exist. This would be extremely expensive. Intention locks solve this by requiring transactions to register their intent at the table level before acquiring row locks.

When InnoDB processes a statement like `SELECT ... FOR SHARE`, it first acquires an IS lock on the table, then acquires S locks on the specific rows. For `SELECT ... FOR UPDATE` or DML statements, it acquires an IX lock on the table, then X locks on rows.

## Lock Compatibility Matrix

Intention locks are compatible with each other but not with full table locks:

| | IS | IX | S | X |
|---|---|---|---|---|
| IS | Yes | Yes | Yes | No |
| IX | Yes | Yes | No | No |
| S | Yes | No | Yes | No |
| X | No | No | No | No |

IS and IX locks are always compatible with each other, which allows many transactions to access rows concurrently. Only when a transaction needs a full table-level S or X lock (such as `LOCK TABLES ... READ/WRITE`) does contention occur.

## Viewing Intention Locks

You can observe intention locks through the Performance Schema or INFORMATION_SCHEMA:

```sql
SELECT
  r.trx_id AS waiting_trx,
  r.trx_mysql_thread_id AS waiting_thread,
  b.trx_id AS blocking_trx,
  b.trx_mysql_thread_id AS blocking_thread
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

To see active locks including intention locks:

```sql
SELECT * FROM performance_schema.data_locks
WHERE LOCK_TYPE = 'TABLE';
```

## Practical Example

Consider two concurrent transactions:

```sql
-- Transaction 1: acquires IX on the table, X on specific rows
BEGIN;
UPDATE orders SET status = 'shipped' WHERE id = 101;

-- Transaction 2: acquires IX on the table, X on different rows
BEGIN;
UPDATE orders SET status = 'cancelled' WHERE id = 202;
```

Both transactions hold IX intention locks on the `orders` table simultaneously. Since IX is compatible with IX, both proceed without blocking. If a third transaction attempted `LOCK TABLES orders WRITE`, it would be blocked until both transactions commit.

## Summary

Intention locks are a lightweight, automatically managed mechanism in InnoDB that coordinate between row-level and table-level locking. They are created and released by InnoDB automatically and cannot be set manually. Understanding them helps diagnose lock contention and design transactions that minimize blocking. When you see TABLE-level locks in Performance Schema output, those are typically intention locks indicating active row-level locking activity.
