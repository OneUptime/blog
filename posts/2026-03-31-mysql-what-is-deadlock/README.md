# What Is a Deadlock in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Deadlock, InnoDB, Transaction, Lock

Description: A deadlock in MySQL occurs when two or more transactions permanently block each other by holding locks the other needs, requiring InnoDB to automatically detect and resolve them.

---

## Overview

A deadlock occurs when two or more transactions are each waiting for a lock held by the other, creating a circular dependency that none of them can break on their own. MySQL's InnoDB engine automatically detects deadlocks and resolves them by rolling back one of the transactions - the "victim" - so the other can proceed.

Deadlocks are a normal part of concurrent database operation, not bugs in MySQL. They become a problem when they occur too frequently and impact application performance.

## A Classic Deadlock Scenario

```sql
-- Session 1: Acquires lock on row with id=1
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Session 1 now holds a lock on id=1

-- Session 2 (concurrently): Acquires lock on row with id=2
START TRANSACTION;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;
-- Session 2 now holds a lock on id=2

-- Session 1: Tries to lock id=2 - WAITS (Session 2 holds it)
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Session 2: Tries to lock id=1 - WAITS (Session 1 holds it)
UPDATE accounts SET balance = balance + 50 WHERE id = 1;

-- DEADLOCK: InnoDB detects the cycle and rolls back one transaction
-- ERROR 1213 (40001): Deadlock found when trying to get lock;
-- try restarting transaction
```

## How InnoDB Detects Deadlocks

InnoDB maintains a wait-for graph internally. Each time a transaction waits for a lock, InnoDB checks whether that lock is held by a transaction that is itself waiting for a lock held by the first transaction - directly or transitively. When a cycle is detected, InnoDB selects the transaction with the least undo log work (typically the one that has done fewer modifications) as the victim and rolls it back.

## Viewing Deadlock Information

```sql
-- Show the most recent deadlock
SHOW ENGINE INNODB STATUS\G
-- Look for the "LATEST DETECTED DEADLOCK" section
-- It shows both transaction details, the locks held and waited for,
-- and which transaction was rolled back

-- Enable persistent deadlock logging
SET GLOBAL innodb_print_all_deadlocks = ON;
-- Deadlock details are written to the MySQL error log
```

## Monitoring Deadlock Frequency

```sql
-- Check total deadlock count since server start
SELECT NAME, COUNT
FROM information_schema.INNODB_METRICS
WHERE NAME = 'lock_deadlocks';

-- Track deadlock errors via performance_schema (MySQL 8.0.11+)
SELECT SUM_ERROR_RAISED AS deadlock_count
FROM performance_schema.events_errors_summary_global_by_error
WHERE ERROR_NUMBER = 1213;
```

## Preventing Deadlocks

The most effective prevention strategies are:

**1. Access rows in a consistent order across all transactions:**
```sql
-- Always update id=1 before id=2 in all transactions
-- This prevents the classic cycle
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

**2. Keep transactions short and commit quickly:**
```sql
-- Bad: Long-running transaction holding locks
START TRANSACTION;
-- ... application does other work for 10 seconds ...
UPDATE orders SET status = 'processed' WHERE order_id = 42;
COMMIT;

-- Better: Do all application logic before starting the transaction
-- Then execute and commit quickly
START TRANSACTION;
UPDATE orders SET status = 'processed' WHERE order_id = 42;
COMMIT;
```

**3. Use SELECT ... FOR UPDATE to acquire locks upfront:**
```sql
-- Acquire all needed locks at the start in a predictable order
START TRANSACTION;
SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

## Handling Deadlocks in Application Code

Applications should always retry on deadlock errors (error code 1213):

```python
import pymysql
import time

def transfer_with_retry(conn, from_id, to_id, amount, max_retries=3):
    for attempt in range(max_retries):
        try:
            with conn.cursor() as cursor:
                cursor.execute("START TRANSACTION")
                cursor.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", (amount, from_id))
                cursor.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", (amount, to_id))
                cursor.execute("COMMIT")
            return True
        except pymysql.err.OperationalError as e:
            if e.args[0] == 1213:  # Deadlock
                conn.rollback()
                time.sleep(0.1 * (attempt + 1))
            else:
                raise
    return False
```

## Summary

A deadlock in MySQL is a circular lock wait where two or more transactions each hold a lock the other needs. InnoDB automatically detects and resolves deadlocks by rolling back the transaction with the least work done. Deadlocks are prevented by accessing rows in a consistent order, keeping transactions short, and acquiring locks upfront with SELECT ... FOR UPDATE. Applications must handle error 1213 by retrying the rolled-back transaction.
