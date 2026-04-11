# What Is the InnoDB Undo Log in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Undo Log, Transaction, MVCC

Description: The InnoDB undo log stores previous row versions to support transaction rollback and MVCC, enabling consistent reads without blocking writes in MySQL.

---

## Overview

The InnoDB undo log is a collection of records that store the previous state of data rows before a transaction modified them. The undo log serves two critical purposes in InnoDB: enabling transaction rollback and supporting Multi-Version Concurrency Control (MVCC).

When a transaction modifies a row, InnoDB writes the original row data to the undo log before making the change. If the transaction needs to be rolled back, InnoDB reads the undo log and restores the original values. For MVCC, long-running read transactions use the undo log to reconstruct older versions of rows, providing a consistent snapshot without blocking writers.

## How MVCC Uses the Undo Log

InnoDB's MVCC model allows readers and writers to operate concurrently without locking each other. Each transaction sees a consistent snapshot of the data as it existed at the start of the transaction (or statement, depending on isolation level).

```sql
-- Session 1: Start a long-running read transaction
START TRANSACTION;
SELECT * FROM orders WHERE status = 'pending';
-- This transaction now holds a consistent read view

-- Session 2: Meanwhile, update an order
UPDATE orders SET status = 'shipped' WHERE order_id = 42;
COMMIT;

-- Session 1: This still returns the original "pending" status
-- InnoDB reads the old version from the undo log
SELECT * FROM orders WHERE order_id = 42;

COMMIT; -- Release the read view
```

## Transaction Rollback

```sql
START TRANSACTION;
UPDATE products SET price = 999.99 WHERE id = 1;
UPDATE products SET price = 899.99 WHERE id = 2;

-- Something went wrong
ROLLBACK;
-- InnoDB reads undo log entries and restores original prices
```

## Undo Tablespaces

The undo log is stored in undo tablespaces. In MySQL 8.0, InnoDB creates two default undo tablespaces automatically. You can add more for better I/O distribution.

```sql
-- View existing undo tablespaces
SELECT TABLESPACE_NAME, FILE_NAME, STATE
FROM information_schema.FILES
WHERE FILE_TYPE = 'UNDO LOG';

-- Add an undo tablespace
CREATE UNDO TABLESPACE undo_003
ADD DATAFILE 'undo_003.ibu';

-- Check undo tablespace status
SELECT NAME, STATE, FILE_SIZE
FROM information_schema.INNODB_TABLESPACES
WHERE SPACE_TYPE = 'Undo';
```

## Undo Log Purge

InnoDB's purge thread periodically removes undo log records that are no longer needed - records that are older than the oldest active read view. If long-running transactions prevent purge from advancing, the undo log grows.

```sql
-- Check the undo log purge lag
SHOW ENGINE INNODB STATUS\G
-- Look for "History list length" in the TRANSACTIONS section
-- A large history list (e.g., > 1000) indicates purge is falling behind

-- Monitor history list length
SELECT COUNT AS history_list_length
FROM information_schema.INNODB_METRICS
WHERE NAME = 'trx_rseg_history_len';
```

A growing history list is often caused by an idle transaction that opened a read view and was abandoned:

```sql
-- Find long-running transactions holding read views
SELECT
  trx_id,
  trx_started,
  trx_state,
  TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_seconds,
  trx_query
FROM information_schema.INNODB_TRX
ORDER BY trx_started
LIMIT 10;
```

## Undo Log Truncation

In MySQL 8.0, undo tablespaces can be automatically truncated when they grow too large:

```sql
-- Enable automatic undo log truncation
SET GLOBAL innodb_undo_log_truncate = ON;

-- Set the threshold for truncation (default is 1GB)
SHOW VARIABLES LIKE 'innodb_max_undo_log_size';
SET GLOBAL innodb_max_undo_log_size = 1073741824; -- 1GB
```

## Summary

The InnoDB undo log stores pre-modification row versions to support two core InnoDB features: transaction rollback and MVCC consistent reads. Purge threads reclaim undo log space once records are no longer needed by any active transaction. Long-running or abandoned transactions can cause undo log bloat by preventing purge advancement, which is visible as a growing history list length. Monitoring the history list and avoiding idle open transactions are the key practices for keeping undo log size under control.
