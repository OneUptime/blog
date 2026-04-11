# How to Query INFORMATION_SCHEMA.INNODB_TRX in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, InnoDB, Transaction, Monitoring

Description: Learn how to query INFORMATION_SCHEMA.INNODB_TRX in MySQL to monitor active InnoDB transactions, detect long-running transactions, and prevent deadlock scenarios.

---

## Overview

`INFORMATION_SCHEMA.INNODB_TRX` provides a real-time snapshot of all active InnoDB transactions. Long-running transactions cause lock retention, undo log growth, and replication lag. This table is your primary tool for detecting and eliminating problematic transactions.

## Basic Query

```sql
SELECT
  TRX_ID,
  TRX_STATE,
  TRX_STARTED,
  TRX_REQUESTED_LOCK_ID,
  TRX_WAIT_STARTED,
  TRX_WEIGHT,
  TRX_MYSQL_THREAD_ID,
  TRX_QUERY
FROM information_schema.INNODB_TRX
ORDER BY TRX_STARTED;
```

## Key Columns

| Column | Description |
|--------|-------------|
| `TRX_ID` | Internal InnoDB transaction ID |
| `TRX_STATE` | RUNNING, LOCK WAIT, ROLLING BACK, or COMMITTING |
| `TRX_STARTED` | Transaction start time |
| `TRX_WEIGHT` | Reflects the number of locked rows and modified rows (not an exact count). Transactions that changed nontransactional tables are weighted heavier. Used by InnoDB to pick the deadlock victim |
| `TRX_MYSQL_THREAD_ID` | MySQL processlist ID |
| `TRX_QUERY` | Currently executing SQL |
| `TRX_LOCK_STRUCTS` | Number of lock structures held |
| `TRX_ROWS_LOCKED` | Approximate rows locked |
| `TRX_ROWS_MODIFIED` | Rows modified by this transaction |
| `TRX_ISOLATION_LEVEL` | Transaction isolation level |

## Finding Long-Running Transactions

```sql
SELECT
  TRX_ID,
  TRX_STATE,
  TRX_STARTED,
  TIMESTAMPDIFF(SECOND, TRX_STARTED, NOW()) AS age_sec,
  TRX_ROWS_LOCKED,
  TRX_ROWS_MODIFIED,
  TRX_MYSQL_THREAD_ID,
  TRX_QUERY
FROM information_schema.INNODB_TRX
ORDER BY TRX_STARTED
LIMIT 10;
```

## Finding Transactions Waiting for Locks

```sql
SELECT
  TRX_ID,
  TRX_STATE,
  TRX_WAIT_STARTED,
  TIMESTAMPDIFF(SECOND, TRX_WAIT_STARTED, NOW()) AS wait_sec,
  TRX_REQUESTED_LOCK_ID,
  TRX_QUERY
FROM information_schema.INNODB_TRX
WHERE TRX_STATE = 'LOCK WAIT'
ORDER BY TRX_WAIT_STARTED;
```

## Joining with PROCESSLIST to Identify Connection Details

```sql
SELECT
  t.TRX_ID,
  t.TRX_STATE,
  TIMESTAMPDIFF(SECOND, t.TRX_STARTED, NOW()) AS age_sec,
  p.USER,
  p.HOST,
  t.TRX_ROWS_LOCKED,
  t.TRX_QUERY
FROM information_schema.INNODB_TRX t
JOIN information_schema.PROCESSLIST p
  ON t.TRX_MYSQL_THREAD_ID = p.ID
ORDER BY t.TRX_STARTED;
```

## Finding Heavy Transactions (Many Locked Rows)

```sql
SELECT
  TRX_ID,
  TRX_ROWS_LOCKED,
  TRX_ROWS_MODIFIED,
  TRX_LOCK_STRUCTS,
  TIMESTAMPDIFF(SECOND, TRX_STARTED, NOW()) AS age_sec
FROM information_schema.INNODB_TRX
ORDER BY TRX_ROWS_LOCKED DESC
LIMIT 10;
```

## Generating Kill Commands for Stuck Transactions

```sql
SELECT
  CONCAT('KILL ', TRX_MYSQL_THREAD_ID, ';') AS kill_stmt,
  TIMESTAMPDIFF(SECOND, TRX_STARTED, NOW()) AS age_sec,
  TRX_QUERY
FROM information_schema.INNODB_TRX
WHERE TIMESTAMPDIFF(SECOND, TRX_STARTED, NOW()) > 300
ORDER BY TRX_STARTED;
```

## Summary

`INFORMATION_SCHEMA.INNODB_TRX` is the essential tool for monitoring active InnoDB transaction state. By tracking transaction age, rows locked, and wait status, you can quickly identify long-running transactions that cause lock contention and undo log bloat, and take action before they impact overall database performance and replication health.
