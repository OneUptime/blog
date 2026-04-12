# How to Find Lock Contention Using Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Lock, Contention, Diagnostic

Description: Learn how to use the MySQL Performance Schema to identify lock contention, blocked queries, and deadlock patterns in InnoDB transactions.

---

Lock contention occurs when transactions wait for each other to release locks, reducing throughput and increasing response times. The MySQL Performance Schema provides detailed tables for identifying which queries are blocked, which transactions hold the conflicting locks, and how long the contention has been occurring.

## Enable Required Instruments and Consumers

First, ensure the necessary instruments are enabled:

```sql
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'wait/lock/metadata/%'
   OR NAME LIKE 'wait/lock/table/%'
   OR NAME LIKE 'wait/synch/mutex/innodb/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN (
  'events_waits_current',
  'events_waits_history_long'
);
```

## Finding Currently Blocked Queries

The most useful starting point - which queries are waiting for locks right now:

```sql
SELECT
  r.trx_id AS waiting_trx,
  r.trx_mysql_thread_id AS waiting_thread,
  r.trx_query AS waiting_query,
  b.trx_id AS blocking_trx,
  b.trx_mysql_thread_id AS blocking_thread,
  b.trx_query AS blocking_query,
  TIMESTAMPDIFF(SECOND, r.trx_wait_started, NOW()) AS wait_seconds
FROM performance_schema.data_lock_waits w
JOIN information_schema.INNODB_TRX r
  ON w.REQUESTING_ENGINE_TRANSACTION_ID = r.trx_id
JOIN information_schema.INNODB_TRX b
  ON w.BLOCKING_ENGINE_TRANSACTION_ID = b.trx_id
ORDER BY wait_seconds DESC;
```

## Using data_locks and data_lock_waits

MySQL 8.0 provides dedicated Performance Schema tables for lock analysis:

```sql
SELECT
  w.REQUESTING_ENGINE_TRANSACTION_ID AS waiting_trx,
  w.BLOCKING_ENGINE_TRANSACTION_ID AS blocking_trx,
  r.OBJECT_SCHEMA,
  r.OBJECT_NAME,
  r.INDEX_NAME,
  r.LOCK_TYPE,
  r.LOCK_MODE,
  r.LOCK_STATUS
FROM performance_schema.data_lock_waits w
JOIN performance_schema.data_locks r
  ON w.REQUESTING_ENGINE_LOCK_ID = r.ENGINE_LOCK_ID
ORDER BY w.REQUESTING_ENGINE_TRANSACTION_ID;
```

## Identifying Transactions Holding Locks

Find which transactions currently hold row locks and for how long:

```sql
SELECT
  t.trx_id,
  t.trx_mysql_thread_id,
  t.trx_started,
  TIMESTAMPDIFF(SECOND, t.trx_started, NOW()) AS age_seconds,
  t.trx_rows_locked,
  t.trx_query
FROM information_schema.INNODB_TRX t
WHERE t.trx_rows_locked > 0
ORDER BY age_seconds DESC;
```

Long-running transactions that hold many row locks are the primary cause of contention. Investigate and terminate them if necessary.

## Checking Wait Events from Performance Schema

```sql
SELECT
  t.PROCESSLIST_ID,
  t.PROCESSLIST_USER,
  t.PROCESSLIST_DB,
  e.EVENT_NAME,
  e.SOURCE,
  e.TIMER_WAIT / 1000000000 AS wait_ms
FROM performance_schema.threads t
JOIN performance_schema.events_waits_current e
  ON t.THREAD_ID = e.THREAD_ID
WHERE e.EVENT_NAME LIKE 'wait/lock%'
  AND e.TIMER_WAIT > 1000000000  -- waits > 1ms
ORDER BY e.TIMER_WAIT DESC;
```

## Using the sys Schema for Lock Summaries

The `sys` schema provides convenient views:

```sql
-- Sessions waiting for locks
SELECT * FROM sys.innodb_lock_waits\G

-- Statements that have caused or waited for locks most
SELECT * FROM sys.schema_table_lock_waits;
```

## Detecting Metadata Lock Contention

Metadata locks (MDL) block DDL operations when DML transactions are open:

```sql
SELECT
  g.OBJECT_TYPE,
  g.OBJECT_SCHEMA,
  g.OBJECT_NAME,
  g.LOCK_TYPE,
  g.LOCK_DURATION,
  g.LOCK_STATUS,
  t.PROCESSLIST_ID,
  t.PROCESSLIST_INFO
FROM performance_schema.metadata_locks g
JOIN performance_schema.threads t ON g.OWNER_THREAD_ID = t.THREAD_ID
WHERE g.LOCK_STATUS = 'GRANTED'
ORDER BY g.OBJECT_NAME;
```

## Summary

The MySQL Performance Schema provides a comprehensive set of tables for diagnosing lock contention. Start with `data_lock_waits` and `data_locks` for row-level InnoDB lock analysis, use `sys.innodb_lock_waits` for a human-readable overview, and check `metadata_locks` when DDL operations are stalling. Long-running transactions are the most common cause of lock contention - identify them with `INNODB_TRX` and kill or optimize them to restore throughput.
