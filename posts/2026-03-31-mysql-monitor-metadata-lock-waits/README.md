# How to Monitor Metadata Lock Waits in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Metadata Lock, Performance Schema, Monitoring, DDL

Description: Learn how to use Performance Schema and information_schema to monitor, diagnose, and resolve MySQL metadata lock wait issues in production databases.

---

## Overview

Metadata lock (MDL) waits are one of the most common sources of sudden database slowdowns, particularly when DDL operations are attempted on busy tables. This guide covers the tools and queries needed to detect, diagnose, and resolve MDL contention.

## Enabling MDL Monitoring

First, ensure Performance Schema has MDL instrumentation enabled:

```sql
-- Enable MDL wait tracking
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME = 'wait/lock/metadata/sql/mdl';

-- Enable statement history consumers
UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN (
    'events_statements_current',
    'events_statements_history',
    'events_waits_current'
);
```

Verify the configuration:

```sql
SELECT NAME, ENABLED, TIMED
FROM performance_schema.setup_instruments
WHERE NAME = 'wait/lock/metadata/sql/mdl';
```

## Checking for Active MDL Waits

The primary query for identifying MDL contention:

```sql
SELECT
    mdl.OBJECT_SCHEMA,
    mdl.OBJECT_NAME,
    mdl.LOCK_TYPE,
    mdl.LOCK_DURATION,
    mdl.LOCK_STATUS,
    pl.ID AS process_id,
    pl.USER,
    pl.HOST,
    pl.DB,
    pl.COMMAND,
    pl.TIME AS seconds_waiting,
    pl.STATE,
    LEFT(pl.INFO, 200) AS current_query
FROM performance_schema.metadata_locks mdl
JOIN information_schema.processlist pl
    ON mdl.OWNER_THREAD_ID = (
        SELECT THREAD_ID
        FROM performance_schema.threads
        WHERE PROCESSLIST_ID = pl.ID
    )
ORDER BY pl.TIME DESC;
```

## Finding the Blocker and Waiter

This comprehensive query shows both the blocking and waiting sessions:

```sql
SELECT
    waiting.PROCESSLIST_ID AS waiting_pid,
    waiting_stmt.SQL_TEXT AS waiting_query,
    blocking.PROCESSLIST_ID AS blocking_pid,
    blocking_stmt.SQL_TEXT AS blocking_query,
    blocking.PROCESSLIST_TIME AS blocking_duration_sec,
    mdl_wait.OBJECT_SCHEMA,
    mdl_wait.OBJECT_NAME
FROM performance_schema.metadata_locks mdl_wait
JOIN performance_schema.metadata_locks mdl_block
    ON mdl_wait.OBJECT_SCHEMA = mdl_block.OBJECT_SCHEMA
    AND mdl_wait.OBJECT_NAME = mdl_block.OBJECT_NAME
    AND mdl_wait.LOCK_STATUS = 'PENDING'
    AND mdl_block.LOCK_STATUS = 'GRANTED'
JOIN performance_schema.threads waiting
    ON waiting.THREAD_ID = mdl_wait.OWNER_THREAD_ID
JOIN performance_schema.threads blocking
    ON blocking.THREAD_ID = mdl_block.OWNER_THREAD_ID
LEFT JOIN performance_schema.events_statements_current waiting_stmt
    ON waiting_stmt.THREAD_ID = waiting.THREAD_ID
LEFT JOIN performance_schema.events_statements_current blocking_stmt
    ON blocking_stmt.THREAD_ID = blocking.THREAD_ID;
```

## Using sys Schema for Simplified Monitoring

MySQL's `sys` schema provides ready-made views:

```sql
-- Show schema MDL blocking chains
SELECT * FROM sys.schema_table_lock_waits;

-- Show all current waits with full detail
SELECT
    waiting_pid,
    waiting_query,
    waiting_lock_type,
    blocking_pid,
    blocking_query,
    blocking_lock_type,
    blocking_trx_age,
    sql_kill_blocking_connection
FROM sys.schema_table_lock_waits;
```

The `sql_kill_blocking_connection` column gives you the exact KILL command to run.

## Setting Up an Alert Query

Use this as a canned diagnostic query to run when you suspect MDL issues:

```sql
-- Quick check: are any threads waiting for metadata locks?
SELECT
    COUNT(*) AS threads_waiting_for_mdl,
    MAX(TIME) AS longest_wait_seconds
FROM information_schema.processlist
WHERE STATE IN (
    'Waiting for table metadata lock',
    'Waiting for stored procedure metadata lock',
    'Waiting for trigger metadata lock'
);
```

## Preventing MDL Issues

```sql
-- Set a timeout so DDL doesn't wait forever
SET SESSION lock_wait_timeout = 60;

-- Check for long-running transactions before running DDL
SELECT trx_id, trx_started, trx_state,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_seconds
FROM information_schema.innodb_trx
ORDER BY age_seconds DESC;
```

## Summary

Monitoring MySQL metadata lock waits requires enabling the MDL instrument in Performance Schema and querying `performance_schema.metadata_locks` joined with thread and statement tables. The `sys.schema_table_lock_waits` view simplifies diagnosis by showing blocker and waiter pairs with ready-to-use KILL commands. Proactively set `lock_wait_timeout` to bound DDL wait times, and query `information_schema.innodb_trx` before running ALTER TABLE to ensure no long-running transactions will block your schema changes.
