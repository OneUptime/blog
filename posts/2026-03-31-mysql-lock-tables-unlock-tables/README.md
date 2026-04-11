# How to Use LOCK TABLES and UNLOCK TABLES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Locking, Transaction, InnoDB, Backup

Description: Learn how LOCK TABLES and UNLOCK TABLES work in MySQL, when to use them, and how they interact with transactions and InnoDB.

---

## What Are LOCK TABLES and UNLOCK TABLES?

`LOCK TABLES` acquires a table-level lock on one or more tables for the current session. While the lock is held, other sessions cannot perform conflicting operations on the locked tables. `UNLOCK TABLES` releases all table locks held by the current session.

## Syntax

```sql
-- Acquire a READ lock (allows other sessions to read but not write)
LOCK TABLES employees READ;

-- Acquire a WRITE lock (exclusive - blocks all other reads and writes)
LOCK TABLES employees WRITE;

-- Lock multiple tables at once
LOCK TABLES employees READ, departments WRITE;

-- Release all locks
UNLOCK TABLES;
```

## READ vs WRITE Locks

```sql
-- READ lock: allows concurrent reads from other sessions
LOCK TABLES orders READ;
SELECT * FROM orders;  -- Allowed in this session
-- Other sessions can also SELECT from orders
-- But: UPDATE, INSERT, DELETE on orders is blocked for all sessions

UNLOCK TABLES;

-- WRITE lock: exclusive access for this session
LOCK TABLES orders WRITE;
SELECT * FROM orders;   -- Allowed
UPDATE orders SET status = 'archived' WHERE id = 1;  -- Allowed
-- Other sessions: all reads and writes are blocked

UNLOCK TABLES;
```

## Interaction with Transactions

`LOCK TABLES` implicitly commits any active transaction before attempting to lock the tables. Note that autocommit is not disabled automatically — you must set it manually if needed:

```sql
-- IMPORTANT: LOCK TABLES commits any open transaction
START TRANSACTION;
UPDATE accounts SET balance = 500 WHERE id = 1;

LOCK TABLES orders READ;
-- The UPDATE above is COMMITTED here automatically!

UNLOCK TABLES;
```

Never use LOCK TABLES inside an active transaction expecting the transaction to remain open.

## Common Use Case: Consistent Backups

LOCK TABLES is commonly used to create consistent logical backups with mysqldump:

```bash
# mysqldump uses --lock-tables internally for non-InnoDB tables
mysqldump --lock-tables mydb mytable > backup.sql

# For InnoDB, use --single-transaction instead
mysqldump --single-transaction mydb > backup.sql
```

```sql
-- Manual consistent backup approach for mixed storage engines
FLUSH TABLES WITH READ LOCK;
-- Take your snapshot/backup here
UNLOCK TABLES;
```

## FLUSH TABLES WITH READ LOCK

For server-wide read locks during backup:

```sql
-- Acquires a global read lock and flushes all open table caches
FLUSH TABLES WITH READ LOCK;

-- Now safe to take a filesystem snapshot or binary log position
SHOW MASTER STATUS;

-- Release the global lock
UNLOCK TABLES;
```

## Checking Current Table Locks

```sql
-- Show open tables and their lock status
SHOW OPEN TABLES WHERE In_use > 0;

-- View table lock waits
SHOW STATUS LIKE 'Table_locks_waited';
SHOW STATUS LIKE 'Table_locks_immediate';
```

## Why to Prefer InnoDB Row Locks Over LOCK TABLES

For transactional workloads, prefer InnoDB row-level locking:

```sql
-- Better: row-level locking with transactions
START TRANSACTION;
SELECT * FROM orders WHERE id = 5 FOR UPDATE;
UPDATE orders SET status = 'shipped' WHERE id = 5;
COMMIT;

-- Worse: table-level lock blocks all other operations on the table
LOCK TABLES orders WRITE;
UPDATE orders SET status = 'shipped' WHERE id = 5;
UNLOCK TABLES;
```

Row locks allow concurrent access to other rows, significantly improving throughput.

## Summary

`LOCK TABLES` acquires table-level locks for the current session, blocking concurrent reads (WRITE lock) or writes (READ lock). It is primarily useful for consistent backups of non-InnoDB tables and `FLUSH TABLES WITH READ LOCK` operations. For typical application code, InnoDB row-level locking with transactions is strongly preferred due to much better concurrency.
