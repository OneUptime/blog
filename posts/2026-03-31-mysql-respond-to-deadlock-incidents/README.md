# How to Respond to MySQL Deadlock Incidents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Deadlock, InnoDB, Transaction, Incident Response

Description: A practical guide for detecting, diagnosing, and resolving MySQL InnoDB deadlock incidents to restore application stability.

---

## What Is a MySQL Deadlock?

A deadlock occurs when two or more transactions are each waiting for the other to release a lock, creating a cycle that can never resolve on its own. InnoDB automatically detects deadlocks and kills one of the transactions (the victim), returning error 1213 to the application: `Deadlock found when trying to get lock; try restarting transaction`.

## Detecting a Deadlock Incident

Deadlocks are logged by InnoDB. To view the most recent deadlock:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for the `LATEST DETECTED DEADLOCK` section in the output. It shows the two transactions involved, the locks they held, and the locks they were waiting for.

To enable persistent deadlock logging to the error log:

```sql
SET GLOBAL innodb_print_all_deadlocks = ON;
```

## Reading the Deadlock Output

A typical deadlock report looks like this:

```text
------------------------
LATEST DETECTED DEADLOCK
------------------------
*** (1) TRANSACTION:
TRANSACTION 421, ACTIVE 0 sec starting index read
MySQL thread id 45, OS thread handle 140, query id 890
UPDATE orders SET status='shipped' WHERE id=101

*** (1) HOLDS THE LOCK(S):
RECORD LOCKS space id 42 page no 3 n bits 72 index PRIMARY
lock_mode X locks rec but not gap

*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 43 page no 5 index PRIMARY
lock_mode X locks rec but not gap

*** (2) TRANSACTION:
TRANSACTION 422, ACTIVE 0 sec starting index read
UPDATE order_items SET status='shipped' WHERE order_id=101

*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 43 page no 5 n bits 72 index PRIMARY
lock_mode X locks rec but not gap

*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 42 page no 3 index PRIMARY
lock_mode X locks rec but not gap

*** WE ROLL BACK TRANSACTION (2)
```

Transaction 1 holds a lock on `orders` and wants `order_items`. Transaction 2 holds a lock on `order_items` and wants `orders`. Neither can proceed.

## Immediate Mitigation

InnoDB resolves deadlocks automatically by rolling back one transaction. Your application should implement retry logic:

```python
import mysql.connector
import time

def execute_with_retry(conn, query, params, max_retries=3):
    for attempt in range(max_retries):
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return
        except mysql.connector.errors.DatabaseError as e:
            if e.errno == 1213 and attempt < max_retries - 1:
                conn.rollback()
                time.sleep(0.1 * (2 ** attempt))
                continue
            raise
```

## Root Cause Analysis

Most deadlocks are caused by inconsistent lock ordering. To prevent them, ensure all transactions access tables and rows in the same order:

```sql
-- Deadlock-prone: Transaction A locks orders then order_items
--                 Transaction B locks order_items then orders

-- Fix: Always lock in the same order (orders first, then order_items)
START TRANSACTION;
SELECT * FROM orders WHERE id = 101 FOR UPDATE;
SELECT * FROM order_items WHERE order_id = 101 FOR UPDATE;
UPDATE orders SET status = 'shipped' WHERE id = 101;
UPDATE order_items SET status = 'shipped' WHERE order_id = 101;
COMMIT;
```

Other common fixes:
- Keep transactions short to minimize lock hold time
- Use lower isolation levels (READ COMMITTED) where appropriate
- Add indexes to reduce the number of rows locked

## Monitoring Deadlock Frequency

Track deadlocks over time using Performance Schema:

```sql
SELECT schema_name, digest_text,
       sum_no_index_used, count_star,
       sum_lock_time / 1e12 AS total_lock_time_s
FROM performance_schema.events_statements_summary_by_digest
WHERE sum_lock_time > 0
ORDER BY sum_lock_time DESC
LIMIT 10;
```

Also monitor the InnoDB deadlock counter:

```sql
SELECT NAME, COUNT FROM information_schema.INNODB_METRICS WHERE NAME = 'lock_deadlocks';
```

Set an alert if `lock_deadlocks` increases by more than a threshold per minute.

## Prevention Checklist

- Ensure application code retries on deadlock errors (1213)
- Access tables in a consistent order across all transactions
- Keep transactions as short as possible
- Use `SELECT ... FOR UPDATE` only when necessary
- Review deadlock logs weekly with `pt-deadlock-logger` from Percona Toolkit

## Summary

MySQL deadlock incidents are automatically resolved by InnoDB, but application retry logic is essential to handle the resulting errors gracefully. Diagnosing deadlocks requires reading `SHOW ENGINE INNODB STATUS` output to understand which transactions are conflicting. Long-term prevention focuses on consistent lock ordering, short transactions, and appropriate indexing to minimize lock scope.
