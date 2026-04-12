# How to Detect Deadlocks in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, Deadlock, InnoDB

Description: Learn how to detect, diagnose, and resolve MySQL deadlocks using SHOW ENGINE INNODB STATUS, performance_schema, and error log analysis.

---

## What Is a Deadlock?

A deadlock occurs when two or more transactions each hold a lock that the other needs, creating a circular dependency where neither can proceed. MySQL InnoDB automatically detects deadlocks and kills one of the transactions (the "victim"), rolling it back and allowing the other to continue.

## MySQL's Deadlock Response

When InnoDB detects a deadlock, it:
1. Selects the transaction with the least work done as the victim
2. Rolls back the victim transaction
3. Returns error `1213: ER_LOCK_DEADLOCK` to the victim's client
4. Allows the other transaction to proceed

## Example Deadlock Scenario

```sql
-- Transaction 1 (session 1)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;  -- locks row 1
-- now waits for row 2...

-- Transaction 2 (session 2) runs concurrently
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = 2;  -- locks row 2
UPDATE accounts SET balance = balance + 100 WHERE account_id = 1;  -- waits for row 1

-- Transaction 1 continues
UPDATE accounts SET balance = balance + 100 WHERE account_id = 2;  -- waits for row 2

-- DEADLOCK: T1 holds row1 waiting for row2; T2 holds row2 waiting for row1
-- MySQL kills one transaction
```

## Detecting Deadlocks with SHOW ENGINE INNODB STATUS

The most important command for deadlock diagnosis:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `LATEST DETECTED DEADLOCK` section:

```text
------------------------
LATEST DETECTED DEADLOCK
------------------------
2024-01-15 10:23:45 0x7f8b4c0f5700
*** (1) TRANSACTION:
TRANSACTION 421893, ACTIVE 5 sec starting index read
MySQL thread id 42, OS thread handle 140235879167744, query id 18920 localhost root updating
UPDATE accounts SET balance = balance - 100 WHERE account_id = 2

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 567 page no 4 n bits 72 index PRIMARY of table `myapp`.`accounts`
trx id 421893 lock_mode X locks rec but not gap

*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS ... index PRIMARY of table `myapp`.`accounts`
trx id 421893 lock_mode X locks rec but not gap waiting

*** (2) TRANSACTION:
...

*** WE ROLL BACK TRANSACTION (2)
```

This shows exactly which rows each transaction held and waited for.

## Enable Deadlock Logging

In MySQL 8.0, enable persistent deadlock logging in `my.cnf`:

```text
[mysqld]
innodb_print_all_deadlocks = ON
```

This writes every deadlock to the MySQL error log, not just the most recent one shown by `SHOW ENGINE INNODB STATUS`.

```sql
-- Or set dynamically
SET GLOBAL innodb_print_all_deadlocks = ON;
```

## Querying performance_schema for Lock Waits

```sql
-- Current lock waits (MySQL 8.0+)
SELECT
    r.trx_id AS waiting_trx_id,
    r.trx_mysql_thread_id AS waiting_thread,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx_id,
    b.trx_mysql_thread_id AS blocking_thread,
    b.trx_query AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Using performance_schema for Deadlock History (MySQL 8.0)

```sql
SELECT
    OBJECT_SCHEMA,
    OBJECT_NAME,
    INDEX_NAME,
    LOCK_TYPE,
    LOCK_MODE,
    LOCK_STATUS,
    LOCK_DATA
FROM performance_schema.data_locks;
```

## Application-Level Deadlock Handling

Always retry on deadlock errors in application code:

```python
import mysql.connector
import time

def transfer_with_retry(from_id, to_id, amount, max_retries=3):
    conn = mysql.connector.connect(host='localhost', user='root', password='pass', database='myapp')
    cursor = conn.cursor()

    for attempt in range(max_retries):
        try:
            conn.start_transaction()
            cursor.execute(
                "UPDATE accounts SET balance = balance - %s WHERE account_id = %s",
                (amount, from_id)
            )
            cursor.execute(
                "UPDATE accounts SET balance = balance + %s WHERE account_id = %s",
                (amount, to_id)
            )
            conn.commit()
            return True
        except mysql.connector.errors.DatabaseError as e:
            conn.rollback()
            if e.errno == 1213:  # ER_LOCK_DEADLOCK
                time.sleep(0.1 * (attempt + 1))
                continue
            raise
    return False
```

## Preventing Deadlocks

```text
1. Access rows in a consistent order: always lock account_id 1 before 2
2. Keep transactions short and fast
3. Use lower isolation levels (READ COMMITTED) when possible
4. Use SELECT ... FOR UPDATE only when necessary
5. Batch updates to reduce lock duration
6. Add appropriate indexes to reduce the rows locked per operation
```

```sql
-- Always update in consistent primary key order
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE account_id = LEAST(1, 2);
UPDATE accounts SET balance = balance + 100 WHERE account_id = GREATEST(1, 2);
COMMIT;
```

## Summary

MySQL InnoDB automatically detects and resolves deadlocks by rolling back the transaction with the least work. Diagnose deadlocks with `SHOW ENGINE INNODB STATUS\G` to see which rows and transactions were involved. Enable `innodb_print_all_deadlocks = ON` to log all deadlocks. In application code, always handle `ERROR 1213` by retrying the transaction. Prevent deadlocks by accessing rows in a consistent order, keeping transactions short, and using appropriate indexes.
