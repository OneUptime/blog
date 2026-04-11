# How to Understand Metadata Locks in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Metadata Lock, DDL, Transaction, Concurrency

Description: Learn how MySQL metadata locks (MDL) work, why they are acquired, and how they prevent DDL and DML operations from conflicting with each other.

---

## Overview

MySQL metadata locks (MDL) protect the structure of database objects - tables, views, stored procedures, and triggers. Unlike row locks that protect data, metadata locks ensure that the definition of an object cannot change while it is being used by another transaction.

## Why Metadata Locks Exist

Without metadata locks, a scenario like this would cause data corruption:

```text
Transaction A: SELECT * FROM orders WHERE status = 'pending'
(query in progress, reading rows)

Transaction B: ALTER TABLE orders DROP COLUMN status
(would destroy the column Transaction A is reading)
```

MDL prevents this by making DDL operations wait until all concurrent DML transactions complete.

## How MDL Works

Every SQL statement that accesses a table acquires an MDL:

```text
MDL modes (from least to most restrictive):
  SHARED                  - Basic shared lock (HANDLER statements)
  SHARED_READ             - SELECT and other read operations
  SHARED_WRITE            - INSERT, UPDATE, DELETE
  SHARED_NO_READ_WRITE    - LOCK TABLES ... WRITE
  EXCLUSIVE               - DDL operations (ALTER TABLE, DROP TABLE)
```

These modes follow a compatibility matrix - shared modes are compatible with each other, but exclusive mode conflicts with everything.

## Common MDL Wait Scenario

The most common MDL problem occurs with long-running transactions blocking DDL:

```sql
-- Session 1: Start a transaction and leave it open
START TRANSACTION;
SELECT COUNT(*) FROM orders;
-- (transaction stays open, never commits)

-- Session 2: Try to run ALTER TABLE - this WAITS
ALTER TABLE orders ADD INDEX idx_status (status);
-- Stuck waiting for MDL...

-- Session 3: All subsequent queries on 'orders' also WAIT
-- because ALTER TABLE holds a pending EXCLUSIVE MDL request
-- which blocks new SHARED MDL acquisitions
SELECT * FROM orders LIMIT 1;
-- This also waits!
```

## Monitoring MDL Waits

Enable MDL instrumentation in Performance Schema:

```sql
-- Enable MDL event tracking
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME = 'wait/lock/metadata/sql/mdl';
```

Query active MDL waits:

```sql
SELECT
    wt.PROCESSLIST_ID AS waiting_pid,
    wt.PROCESSLIST_INFO AS waiting_query,
    bt.PROCESSLIST_ID AS blocking_pid,
    bt.PROCESSLIST_INFO AS blocking_query,
    bt.PROCESSLIST_TIME AS blocking_time_seconds
FROM performance_schema.metadata_locks wml
JOIN performance_schema.metadata_locks bml
    ON bml.OBJECT_TYPE = wml.OBJECT_TYPE
    AND bml.OBJECT_SCHEMA = wml.OBJECT_SCHEMA
    AND bml.OBJECT_NAME = wml.OBJECT_NAME
    AND bml.LOCK_STATUS = 'GRANTED'
JOIN performance_schema.threads wt
    ON wt.THREAD_ID = wml.OWNER_THREAD_ID
JOIN performance_schema.threads bt
    ON bt.THREAD_ID = bml.OWNER_THREAD_ID
WHERE wml.LOCK_STATUS = 'PENDING';
```

## Finding the Blocking Transaction

When an ALTER TABLE is stuck, find what is blocking it:

```sql
-- Find all threads and their current state
SELECT
    id,
    user,
    host,
    db,
    command,
    time,
    state,
    LEFT(info, 100) AS query
FROM information_schema.processlist
WHERE state LIKE '%metadata lock%'
   OR state LIKE '%Waiting for table%'
ORDER BY time DESC;
```

## Killing a Blocking Connection

Once you identify the blocking thread, you can kill it if appropriate:

```sql
-- Kill the blocking connection (use with caution)
KILL CONNECTION 42;

-- Or kill just the current query without closing the connection
KILL QUERY 42;
```

## Setting MDL Timeout

Configure `lock_wait_timeout` to prevent DDL statements from waiting indefinitely:

```sql
-- Set session-level MDL timeout (seconds)
SET SESSION lock_wait_timeout = 30;

-- Then run your DDL
ALTER TABLE orders ADD INDEX idx_created_at (created_at);
-- Will fail with error 1205 if not acquired within 30 seconds
```

## Summary

MySQL metadata locks are a critical concurrency mechanism that ensures table structure cannot change while transactions are using it. The most common MDL problem is a long-running transaction blocking an ALTER TABLE, which in turn blocks all subsequent DML on that table. Proactively monitor MDL waits via Performance Schema, set `lock_wait_timeout` to bound DDL wait times, and ensure application code commits or rolls back transactions promptly to release MDL as quickly as possible.
