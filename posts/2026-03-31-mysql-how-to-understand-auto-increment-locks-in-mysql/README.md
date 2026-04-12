# How to Understand Auto-Increment Locks in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Auto-Increment, Locking, Concurrency

Description: Understand how MySQL handles AUTO_INCREMENT locking modes, their performance trade-offs, and how to choose the right mode for your workload.

---

## What Are Auto-Increment Locks?

When a table has an `AUTO_INCREMENT` column, MySQL must ensure each inserted row gets a unique, monotonically increasing value. To coordinate this across concurrent inserts, InnoDB uses an internal locking mechanism.

The behavior is controlled by the `innodb_autoinc_lock_mode` variable, which has three possible values: `0` (traditional), `1` (consecutive), and `2` (interleaved).

## The Three Auto-Increment Lock Modes

### Mode 0 - Traditional

In traditional mode, a table-level `AUTO-INC` lock is held for the entire duration of the INSERT statement. This guarantees consecutive IDs but severely limits concurrency.

```sql
-- Check current mode
SHOW VARIABLES LIKE 'innodb_autoinc_lock_mode';

-- Set in my.cnf or at startup
-- innodb_autoinc_lock_mode = 0
```

### Mode 1 - Consecutive (Default Before MySQL 8.0)

Consecutive mode is a compromise. Simple inserts (where the number of rows to insert is known in advance, including single-row and multi-row INSERT VALUES) use a lightweight mutex to get the next ID without a table lock. Bulk inserts (INSERT ... SELECT, LOAD DATA) still use the table-level AUTO-INC lock to guarantee consecutive IDs for the entire batch.

```sql
-- Mode 1 is suitable for most single-row insert workloads
-- innodb_autoinc_lock_mode = 1
```

### Mode 2 - Interleaved (Default in MySQL 8.0+)

Interleaved mode never uses the table-level AUTO-INC lock. All INSERT types use a lightweight mutex. This gives maximum concurrency but means that IDs assigned during bulk inserts may not be consecutive - they can be interleaved with IDs from other concurrent inserts.

```sql
-- Recommended for row-based binary logging workloads
-- innodb_autoinc_lock_mode = 2
```

## Why Mode 2 Is Default in MySQL 8.0

MySQL 8.0 changed the default to mode 2 because row-based binary logging (the new default `binlog_format = ROW`) records the actual row data, not the SQL statement. This means non-consecutive IDs are safe for replication - replicas apply the exact row data including the explicit ID values.

In contrast, statement-based replication (SBR) requires consecutive IDs because the replica re-executes the INSERT statement and must produce the same ID sequence as the primary.

```sql
-- Verify your binlog format
SHOW VARIABLES LIKE 'binlog_format';
```

## Viewing Auto-Increment Values

```sql
-- Check current AUTO_INCREMENT value for a table
SELECT AUTO_INCREMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'orders';

-- Or use SHOW TABLE STATUS
SHOW TABLE STATUS FROM mydb LIKE 'orders'\G
```

## Practical Example: Impact of Lock Mode on Concurrent Inserts

With mode 0, concurrent sessions compete for the table lock:

```sql
-- Session 1 and 2 run simultaneously
-- Session 1:
INSERT INTO logs (message) SELECT message FROM large_batch_table;
-- Session 2 is blocked until Session 1 finishes the entire INSERT
INSERT INTO logs (message) VALUES ('quick log entry');
```

With mode 2, both sessions proceed in parallel:

```sql
-- Session 1 and 2 proceed concurrently
-- IDs assigned will be interleaved, not necessarily consecutive
-- This is fine with row-based replication
```

## Resetting an AUTO_INCREMENT Counter

Sometimes you need to reset the counter, for example after deleting all rows:

```sql
-- Reset auto-increment to 1
ALTER TABLE orders AUTO_INCREMENT = 1;

-- Note: MySQL will never set AUTO_INCREMENT lower than MAX(id) + 1
-- If the table has rows, it will use MAX(id) + 1 instead
```

## Performance Considerations

For high-throughput INSERT workloads, use mode 2 with row-based binary logging. For workloads that rely on consecutive IDs (e.g., ticket systems where gaps are unacceptable), mode 1 provides a balance of performance and consecutiveness for simple inserts.

```sql
-- Check auto-increment mutex contention in performance_schema
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE EVENT_NAME LIKE '%auto_inc%';
```

## Summary

MySQL's AUTO_INCREMENT locking is controlled by `innodb_autoinc_lock_mode`. Mode 2 (interleaved) offers the highest concurrency and is the default in MySQL 8.0 with row-based replication. Mode 1 (consecutive) is appropriate for statement-based replication where consecutive IDs are required for correctness. Understanding this setting is important for both performance tuning and ensuring replication consistency in your MySQL environment.
