# How to Find Long-Running Transactions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Transaction, Monitoring, Performance

Description: Learn how to identify and investigate long-running transactions in MySQL that block other queries, cause lock contention, and grow the undo log.

---

## Why Long-Running Transactions Are Harmful

A long-running transaction in MySQL InnoDB:

- Holds row locks, blocking other writes on the same rows
- Prevents InnoDB from purging old MVCC undo log entries
- Causes the `history list length` to grow, degrading read performance
- Delays replication if the transaction is not committed promptly

## Finding Long-Running Transactions

Query `information_schema.INNODB_TRX` to find transactions by age:

```sql
SELECT
    trx_id,
    trx_state,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_seconds,
    trx_mysql_thread_id AS thread_id,
    trx_rows_locked,
    trx_rows_modified,
    LEFT(trx_query, 200) AS current_query
FROM information_schema.INNODB_TRX
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 30
ORDER BY age_seconds DESC;
```

## Finding the Responsible Thread

Combine with `PROCESSLIST` to see the full connection details:

```sql
SELECT
    t.trx_id,
    t.trx_started,
    TIMESTAMPDIFF(SECOND, t.trx_started, NOW()) AS age_seconds,
    p.ID AS thread_id,
    p.USER,
    p.HOST,
    p.DB,
    p.COMMAND,
    p.TIME AS query_time,
    p.INFO AS current_sql
FROM information_schema.INNODB_TRX t
JOIN information_schema.PROCESSLIST p
    ON t.trx_mysql_thread_id = p.ID
WHERE TIMESTAMPDIFF(SECOND, t.trx_started, NOW()) > 30
ORDER BY age_seconds DESC;
```

## Checking Undo Log Growth

Long-running transactions prevent undo log purge:

```sql
-- Check history list length (should stay under ~1000 in healthy systems)
SHOW ENGINE INNODB STATUS\G
-- Look for: History list length XXXX

-- Also available as a variable
SELECT VARIABLE_VALUE AS history_list_length
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Innodb_history_list_length';
```

A history list length above 10,000 indicates uncontrolled undo log growth.

## Finding Read-Only Long Transactions

Regular long-running SELECTs (without FOR UPDATE) also hold MVCC snapshots:

```sql
-- Find transactions currently running for over 60 seconds
SELECT
    trx_id,
    trx_state,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_seconds,
    trx_mysql_thread_id
FROM information_schema.INNODB_TRX
WHERE trx_state = 'RUNNING'
  AND TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 60;
```

Even read-only transactions that hold a snapshot prevent undo log purge.

## Using Performance Schema Events

For detailed transaction history:

```sql
-- Enable transaction instrumentation (usually enabled by default)
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES'
WHERE NAME = 'transaction';

-- View recent long transactions
SELECT
    THREAD_ID,
    EVENT_NAME,
    STATE,
    TIMER_WAIT / 1e12 AS duration_sec,
    ACCESS_MODE,
    ISOLATION_LEVEL,
    AUTOCOMMIT
FROM performance_schema.events_transactions_current
WHERE TIMER_WAIT / 1e12 > 30
ORDER BY TIMER_WAIT DESC;
```

## Killing a Long-Running Transaction

```sql
-- Find the thread ID from the queries above
-- Kill the connection, which also rolls back the transaction
KILL CONNECTION <thread_id>;
```

## Preventing Long-Running Transactions

```sql
-- Set a maximum execution time for read-only SELECT statements (MySQL 8.0)
SET SESSION MAX_EXECUTION_TIME = 30000;  -- 30 seconds in milliseconds

-- Use wait_timeout to disconnect idle connections
SET GLOBAL wait_timeout = 120;

-- Use interactive_timeout for interactive clients
SET GLOBAL interactive_timeout = 120;
```

## Summary

Long-running transactions in MySQL can be identified through `information_schema.INNODB_TRX` combined with `PROCESSLIST`. They cause lock contention, MVCC undo log growth, and can impact replication. Setting execution time limits, monitoring history list length, and killing problematic connections are the primary remediation strategies.
