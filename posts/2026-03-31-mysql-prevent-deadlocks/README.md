# How to Prevent Deadlocks in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Deadlock, Transaction, Concurrency

Description: Learn proven strategies to prevent deadlocks in MySQL InnoDB, including consistent lock ordering, short transactions, and proper indexing.

---

## What Causes Deadlocks?

A deadlock occurs when two or more transactions each hold a lock that the other needs, creating a circular dependency. InnoDB detects deadlocks automatically and rolls back the transaction with the smallest weight, determined by the number of rows modified and locked. Prevention focuses on eliminating the circular dependency before it occurs.

## Strategy 1: Consistent Lock Ordering

The most reliable prevention technique is always acquiring locks in the same order across all transactions:

```sql
-- WRONG: Transaction A locks id=1 then id=2
--        Transaction B locks id=2 then id=1
-- This creates a circular dependency

-- CORRECT: Both transactions lock in ascending ID order
START TRANSACTION;
-- Always lock the lower ID first
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
SELECT * FROM accounts WHERE id = 2 FOR UPDATE;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
```

When all transactions acquire locks in the same sequence, circular waits are impossible.

## Strategy 2: Keep Transactions Short

Long transactions hold locks for extended periods, increasing the chance of conflicts:

```sql
-- BAD: Long processing inside a transaction
START TRANSACTION;
SELECT * FROM orders WHERE id = 101 FOR UPDATE;
-- Perform 5 seconds of application processing here...
UPDATE orders SET status = 'processed' WHERE id = 101;
COMMIT;

-- GOOD: Do processing outside the transaction
-- 1. Read and process outside transaction
-- 2. Open transaction only for the write
SELECT * FROM orders WHERE id = 101;
-- Process here...
START TRANSACTION;
UPDATE orders SET status = 'processed' WHERE id = 101;
COMMIT;
```

## Strategy 3: Use Proper Indexes

Without appropriate indexes, InnoDB scans more rows and acquires more locks:

```sql
-- Add index to avoid locking entire table range
ALTER TABLE orders ADD INDEX idx_status (status);

-- With index: locks only matching rows
UPDATE orders SET processed = 1 WHERE status = 'pending' AND customer_id = 42;

-- Without index on customer_id: next-key locks on a large range
-- Ensure both columns are indexed
ALTER TABLE orders ADD INDEX idx_customer_status (customer_id, status);
```

## Strategy 4: Use Smaller Batch Sizes

Large batch updates acquire many locks simultaneously:

```sql
-- BAD: Locking thousands of rows at once
UPDATE orders SET status = 'archived' WHERE created_at < '2025-01-01';

-- GOOD: Process in smaller batches
-- Run this statement repeatedly from application code until 0 rows are affected
UPDATE orders SET status = 'archived'
WHERE created_at < '2025-01-01'
  AND status != 'archived'
LIMIT 1000;
```

## Strategy 5: Use READ COMMITTED for Read-Intensive Workloads

READ COMMITTED does not use gap locks, which reduces lock conflicts:

```sql
-- Eliminates gap locks that cause contention on range queries
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Strategy 6: Handle Deadlocks in Application Code

Despite prevention, deadlocks can still occur. Always handle them with retry logic:

```python
import time
import mysql.connector
from mysql.connector import errorcode

def execute_with_retry(conn, sql, params, max_retries=3):
    for attempt in range(max_retries):
        try:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            conn.commit()
            return
        except mysql.connector.Error as err:
            if err.errno == errorcode.ER_LOCK_DEADLOCK:
                conn.rollback()
                if attempt == max_retries - 1:
                    raise
                # Brief pause before retry
                time.sleep(0.1 * (attempt + 1))
                continue
            raise
```

## Monitoring Deadlock Frequency

```sql
-- Track cumulative deadlock count
SELECT COUNT FROM information_schema.INNODB_METRICS
WHERE NAME = 'lock_deadlocks';

-- View the most recent deadlock details
SHOW ENGINE INNODB STATUS\G
-- Look for LATEST DETECTED DEADLOCK section
```

## Summary

Deadlock prevention in MySQL relies on consistent lock ordering, short transactions, proper indexing, and smaller batch sizes. Switching to READ COMMITTED eliminates gap locks that cause range query contention. Even with prevention, application-level deadlock detection and retry logic is essential for robust production systems.
