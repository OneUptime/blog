# How to Use SHOW ENGINE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHOW ENGINE, InnoDB, Performance Diagnostics

Description: Learn how to use SHOW ENGINE INNODB STATUS and SHOW ENGINES in MySQL to diagnose deadlocks, buffer pool usage, and transaction state.

---

## What Is SHOW ENGINE in MySQL

`SHOW ENGINE` is a diagnostic command that provides internal status information about MySQL storage engines. The most commonly used form is `SHOW ENGINE INNODB STATUS`, which returns a detailed snapshot of the InnoDB storage engine's current state, including active transactions, lock waits, deadlock history, buffer pool usage, and I/O statistics.

## SHOW ENGINES - List Available Storage Engines

To see all storage engines available on your MySQL instance:

```sql
SHOW ENGINES\G
```

```text
*************************** 1. row ***************************
      Engine: InnoDB
     Support: DEFAULT
     Comment: Supports transactions, row-level locking, and foreign keys
Transactions: YES
          XA: YES
  Savepoints: YES
*************************** 2. row ***************************
      Engine: MyISAM
     Support: YES
     Comment: MyISAM storage engine
...
```

## SHOW ENGINE INNODB STATUS

The main diagnostic command:

```sql
SHOW ENGINE INNODB STATUS\G
```

The output is divided into several sections:

```text
=====================================
BACKGROUND THREAD
SEMAPHORES
TRANSACTIONS
FILE I/O
INSERT BUFFER AND ADAPTIVE HASH INDEX
LOG
BUFFER POOL AND MEMORY
ROW OPERATIONS
=====================================
```

## Diagnosing Deadlocks

The `LATEST DETECTED DEADLOCK` section shows the last deadlock:

```sql
SHOW ENGINE INNODB STATUS\G
```

Look for `LATEST DETECTED DEADLOCK` in the output:

```text
------------------------
LATEST DETECTED DEADLOCK
------------------------
2026-03-31 02:15:44 thread id 42
*** (1) TRANSACTION:
TRANSACTION 12345, ACTIVE 0 sec starting index read
MySQL thread id 42, query id 1001 localhost root
UPDATE orders SET status = 'processing' WHERE id = 101
*** (1) WAITING FOR THIS LOCK TO BE GRANTED:
RECORD LOCKS space id 45 page no 5 n bits 72 index PRIMARY ...
```

This tells you which queries were involved and what locks they held.

## Checking Buffer Pool Usage

The `BUFFER POOL AND MEMORY` section shows memory utilization:

```text
----------------------
BUFFER POOL AND MEMORY
----------------------
Total large memory allocated 137363456
Buffer pool size   8192
Free buffers       1024
Database pages     7168
Old database pages 2643
Modified db pages  152
...
Buffer pool hit rate 999 / 1000
```

A hit rate below 990/1000 suggests the buffer pool is too small. Increase `innodb_buffer_pool_size` in that case.

## Checking Active Transactions

```sql
SHOW ENGINE INNODB STATUS\G
-- Look for the TRANSACTIONS section
```

Or query `information_schema` for more structured data:

```sql
SELECT trx_id, trx_state, trx_started, trx_query, trx_rows_locked
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

## Checking Lock Waits

```sql
SELECT
    r.trx_id waiting_trx_id,
    r.trx_query waiting_query,
    b.trx_id blocking_trx_id,
    b.trx_query blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx b ON b.trx_id = w.BLOCKING_ENGINE_TRANSACTION_ID
JOIN information_schema.innodb_trx r ON r.trx_id = w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## SHOW ENGINE PERFORMANCE_SCHEMA STATUS

For the performance schema engine:

```sql
SHOW ENGINE PERFORMANCE_SCHEMA STATUS\G
```

This shows memory usage and instrumentation details for the performance schema.

## Enabling Deadlock Logging

By default MySQL only stores the most recent deadlock. Enable verbose InnoDB logging for persistent history:

```sql
SET GLOBAL innodb_print_all_deadlocks = ON;
```

This writes every deadlock to the MySQL error log file for long-term analysis.

## Saving SHOW ENGINE INNODB STATUS Output

In bash, capture the output for analysis:

```bash
mysql -u root -p"$DB_PASS" -e "SHOW ENGINE INNODB STATUS\G" > /tmp/innodb_status_$(date +%Y%m%d_%H%M%S).txt
```

## Summary

`SHOW ENGINE INNODB STATUS` is MySQL's primary InnoDB diagnostic tool, providing real-time snapshots of deadlocks, active transactions, buffer pool health, and I/O patterns. Use it to diagnose locking issues, tune buffer pool size, and investigate performance problems. Combine it with `information_schema.innodb_trx` and `performance_schema.data_lock_waits` for structured lock analysis.
