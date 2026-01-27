# How to Handle MySQL Deadlocks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Deadlocks, Database, Transactions, Locking

Description: Learn how to identify, debug, and prevent MySQL deadlocks including analysis techniques, lock monitoring, and application-level solutions.

---

> Deadlocks are not bugs to eliminate - they are concurrency conditions to manage. Design your application to detect, retry, and minimize them.

Deadlocks happen when two or more transactions each hold locks the other needs, creating a circular wait that cannot resolve on its own. MySQL's InnoDB engine detects these situations automatically and rolls back one transaction to break the cycle. Understanding why deadlocks occur and how to handle them is essential for building reliable database-backed applications.

## What Causes Deadlocks

A deadlock requires four conditions to exist simultaneously:

1. **Mutual exclusion** - Resources (rows/tables) can only be held by one transaction at a time.
2. **Hold and wait** - A transaction holds a lock while waiting for another.
3. **No preemption** - Locks cannot be forcibly taken from a transaction.
4. **Circular wait** - Transaction A waits for B, and B waits for A.

InnoDB uses row-level locking, which reduces contention compared to table locks but makes deadlocks more likely when transactions access overlapping rows in different orders.

## How InnoDB Detects Deadlocks

InnoDB maintains a wait-for graph that tracks which transactions are waiting for locks held by other transactions. When a cycle is detected in this graph, InnoDB immediately:

1. Chooses a victim transaction (typically the one with fewer changes).
2. Rolls back the victim completely.
3. Returns error code 1213 (ER_LOCK_DEADLOCK) to the application.

This detection happens in real-time - deadlocks are resolved within milliseconds. The key insight is that deadlocks are expected behavior, not catastrophic failures.

## Reading SHOW ENGINE INNODB STATUS

The primary tool for analyzing deadlocks is the InnoDB status output:

```sql
-- Run this immediately after a deadlock occurs
SHOW ENGINE INNODB STATUS\G
```

The output contains a `LATEST DETECTED DEADLOCK` section. Here is what to look for:

```
------------------------
LATEST DETECTED DEADLOCK
------------------------
2026-01-27 10:15:32
*** (1) TRANSACTION:
TRANSACTION 12345, ACTIVE 0 sec starting index read
mysql tables in use 1, locked 1
LOCK WAIT 3 lock struct(s), heap size 1136, 2 row lock(s)
MySQL thread id 100, query id 5000 localhost app_user updating
UPDATE orders SET status = 'shipped' WHERE id = 42

*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 50 page no 4 n bits 80 index PRIMARY of table `shop`.`orders`
lock_mode X locks rec but not gap waiting

*** (2) TRANSACTION:
TRANSACTION 12346, ACTIVE 0 sec starting index read
mysql tables in use 1, locked 1
3 lock struct(s), heap size 1136, 2 row lock(s)
MySQL thread id 101, query id 5001 localhost app_user updating
UPDATE orders SET status = 'cancelled' WHERE id = 43

*** (2) HOLDS THE LOCK(S):
RECORD LOCKS space id 50 page no 4 n bits 80 index PRIMARY of table `shop`.`orders`
lock_mode X locks rec but not gap

*** (2) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 50 page no 4 n bits 72 index PRIMARY of table `shop`.`orders`
lock_mode X locks rec but not gap waiting

*** WE ROLL BACK TRANSACTION (1)
```

Key details to extract:

- Which tables and indexes are involved
- What lock modes are requested (X for exclusive, S for shared)
- The actual SQL statements causing the conflict
- Which transaction was chosen as the victim

## Analyzing Deadlock Logs

Enable the InnoDB deadlock monitor to capture all deadlocks to the error log:

```sql
-- Enable detailed deadlock logging
SET GLOBAL innodb_print_all_deadlocks = ON;
```

For systematic analysis, create a summary table:

```sql
-- Track deadlock patterns over time
CREATE TABLE deadlock_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    table_name VARCHAR(255),
    index_name VARCHAR(255),
    transaction_1_query TEXT,
    transaction_2_query TEXT,
    victim_transaction INT,
    notes TEXT
);
```

After each deadlock, parse the status output and insert a row. Patterns will emerge - often 80% of deadlocks come from the same 2-3 code paths.

## Common Deadlock Scenarios

### Scenario 1: Opposite Order Row Updates

Two transactions update the same rows but in reverse order:

```sql
-- Transaction A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Locks row 1
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Waits for row 2

-- Transaction B (running concurrently)
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;   -- Locks row 2
UPDATE accounts SET balance = balance + 50 WHERE id = 1;   -- Waits for row 1
-- DEADLOCK
```

### Scenario 2: Gap Lock Conflicts

Gap locks in REPEATABLE READ isolation can cause unexpected deadlocks:

```sql
-- Transaction A
BEGIN;
SELECT * FROM orders WHERE order_date = '2026-01-27' FOR UPDATE;
-- Locks gap before and after matching rows

-- Transaction B
BEGIN;
INSERT INTO orders (order_date, amount) VALUES ('2026-01-27', 100);
-- Waits for gap lock

-- Transaction A
INSERT INTO orders (order_date, amount) VALUES ('2026-01-27', 200);
-- DEADLOCK - both inserting into locked gap
```

### Scenario 3: Secondary Index Lock Escalation

Updates that modify indexed columns acquire locks on multiple indexes:

```sql
-- Transaction A
BEGIN;
UPDATE products SET category_id = 5 WHERE id = 100;
-- Locks primary key AND secondary index on category_id

-- Transaction B
BEGIN;
UPDATE products SET category_id = 3 WHERE id = 200;
-- Locks its primary key and category_id index entries

-- If the secondary index pages overlap, deadlock can occur
```

## Prevention Strategies

### 1. Consistent Lock Ordering

Always access tables and rows in the same order across all transactions:

```sql
-- Good: Both transactions use the same order
-- Sort by primary key or use a deterministic ordering

-- Application code (pseudo-code):
account_ids = [1, 2]
account_ids.sort()  -- Always process in ascending order

BEGIN;
FOR id IN account_ids:
    UPDATE accounts SET balance = balance + amount WHERE id = {id};
COMMIT;
```

### 2. Keep Transactions Short

Long transactions hold locks longer, increasing deadlock probability:

```sql
-- Bad: Doing non-DB work inside transaction
BEGIN;
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
-- ... call external API (takes 2 seconds) ...
UPDATE orders SET status = 'confirmed' WHERE id = 1;
COMMIT;

-- Good: Minimize lock duration
-- Call external API first
-- Then start transaction
BEGIN;
UPDATE orders SET status = 'confirmed' WHERE id = 1;
COMMIT;
```

### 3. Use Appropriate Isolation Level

READ COMMITTED has fewer gap locks than REPEATABLE READ:

```sql
-- For specific transactions that do bulk inserts
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
-- Your operations here
COMMIT;
```

### 4. Batch Operations with LIMIT

Process large updates in smaller chunks:

```sql
-- Bad: Locks thousands of rows at once
UPDATE orders SET processed = 1 WHERE processed = 0;

-- Good: Process in batches
UPDATE orders SET processed = 1
WHERE processed = 0
ORDER BY id
LIMIT 100;
-- Repeat until no rows affected
```

## Retry Logic in Application Code

Since deadlocks are expected, your application must handle them gracefully. Here is a Python example:

```python
import mysql.connector
import time
import random

def execute_with_retry(connection, operation, max_retries=3):
    """
    Execute a database operation with deadlock retry logic.

    Args:
        connection: MySQL connection object
        operation: Callable that performs the database operation
        max_retries: Maximum number of retry attempts

    Returns:
        Result of the operation

    Raises:
        Exception if all retries fail
    """
    last_error = None

    for attempt in range(max_retries):
        try:
            cursor = connection.cursor()
            result = operation(cursor)
            connection.commit()
            return result

        except mysql.connector.Error as e:
            # Error code 1213 is ER_LOCK_DEADLOCK
            if e.errno == 1213:
                connection.rollback()
                last_error = e

                # Exponential backoff with jitter
                wait_time = (2 ** attempt) * 0.1 + random.uniform(0, 0.1)
                time.sleep(wait_time)

                # Log for monitoring
                print(f"Deadlock detected, attempt {attempt + 1}/{max_retries}")
                continue
            else:
                # Non-deadlock error, raise immediately
                connection.rollback()
                raise

        finally:
            cursor.close()

    # All retries exhausted
    raise Exception(f"Operation failed after {max_retries} deadlock retries") from last_error


# Usage example
def transfer_funds(cursor):
    """Transfer funds between accounts."""
    # Always lock accounts in consistent order (by ID)
    cursor.execute("""
        UPDATE accounts
        SET balance = balance - 100
        WHERE id = 1
    """)
    cursor.execute("""
        UPDATE accounts
        SET balance = balance + 100
        WHERE id = 2
    """)
    return cursor.rowcount

# Execute with automatic deadlock retry
connection = mysql.connector.connect(host='localhost', database='shop')
result = execute_with_retry(connection, transfer_funds)
```

Key points for retry logic:

- Always rollback before retrying
- Use exponential backoff to reduce collision probability
- Add jitter to prevent thundering herd
- Set a maximum retry count to avoid infinite loops
- Log retries for monitoring and alerting

## Index Optimization to Reduce Locks

Proper indexing reduces the number of rows InnoDB must lock:

```sql
-- Without index: Full table scan locks every row examined
EXPLAIN SELECT * FROM orders WHERE customer_id = 42 FOR UPDATE;
-- type: ALL (bad - scanning entire table)

-- Add index to narrow lock scope
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- With index: Only locks matching rows
EXPLAIN SELECT * FROM orders WHERE customer_id = 42 FOR UPDATE;
-- type: ref (good - using index)
```

Covering indexes can further reduce lock contention by avoiding primary key lookups:

```sql
-- Covering index includes all needed columns
CREATE INDEX idx_orders_customer_status
ON orders(customer_id, status, created_at);

-- Query uses only index, no primary key lock needed for reads
SELECT customer_id, status, created_at
FROM orders
WHERE customer_id = 42;
```

## Monitoring Deadlocks in Production

Set up alerts and dashboards for deadlock frequency:

```sql
-- Query the performance_schema for lock wait statistics
SELECT * FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE '%lock%';

-- Monitor InnoDB lock metrics
SHOW GLOBAL STATUS LIKE 'Innodb_row_lock%';
```

Key metrics to track:

| Metric | Description | Alert Threshold |
| --- | --- | --- |
| Innodb_row_lock_waits | Total row lock waits | Trend increase |
| Innodb_row_lock_time_avg | Average wait time (ms) | Above 100ms |
| Innodb_deadlocks | Total deadlock count | Rate above 1/min |

For deeper visibility, enable the performance schema instrumentation:

```sql
-- Enable lock instrumentation
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES'
WHERE NAME LIKE '%lock%';

-- View current lock waits
SELECT
    waiting.THREAD_ID AS waiting_thread,
    waiting.EVENT_NAME AS waiting_for,
    blocking.THREAD_ID AS blocking_thread,
    blocking.EVENT_NAME AS blocking_event
FROM performance_schema.events_waits_current waiting
JOIN performance_schema.events_waits_current blocking
    ON waiting.OBJECT_INSTANCE_BEGIN = blocking.OBJECT_INSTANCE_BEGIN
WHERE waiting.THREAD_ID != blocking.THREAD_ID;
```

## Best Practices Summary

1. **Accept that deadlocks happen** - Design your application to detect and retry.
2. **Implement retry logic everywhere** - Use exponential backoff with jitter.
3. **Keep transactions short** - Do non-DB work outside transaction boundaries.
4. **Lock in consistent order** - Sort keys before updating multiple rows.
5. **Add proper indexes** - Reduce lock scope by avoiding full table scans.
6. **Monitor continuously** - Track deadlock frequency and investigate spikes.
7. **Log deadlock details** - Parse SHOW ENGINE INNODB STATUS after each occurrence.
8. **Consider READ COMMITTED** - Lower isolation level has fewer gap locks.
9. **Batch large updates** - Process in chunks to reduce lock duration.
10. **Review slow queries** - Long-running queries hold locks longer.

---

Deadlocks are a natural consequence of concurrent database access. The goal is not to eliminate them entirely but to minimize their frequency and handle them gracefully when they occur. With proper transaction design, retry logic, and monitoring, deadlocks become a manageable operational concern rather than a source of application failures.

For comprehensive monitoring of your MySQL databases and application health, explore [OneUptime](https://oneuptime.com) - an open-source observability platform that helps you track database performance, set up alerts, and respond to incidents effectively.
