# How to Use HIGH_PRIORITY and LOW_PRIORITY in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, HIGH_PRIORITY, LOW_PRIORITY, Lock

Description: Learn how HIGH_PRIORITY and LOW_PRIORITY modifiers affect MySQL read and write scheduling for MyISAM tables, and understand why they are not relevant for InnoDB.

---

## What Are HIGH_PRIORITY and LOW_PRIORITY

MySQL provides `HIGH_PRIORITY` and `LOW_PRIORITY` modifiers that affect how reads and writes are scheduled when multiple sessions compete for table-level locks. These modifiers only apply to **MyISAM**, **MEMORY**, and **MERGE** storage engines. InnoDB uses row-level locking and has its own MVCC concurrency model, so these hints have no effect on InnoDB tables.

## How MySQL Lock Scheduling Works for MyISAM

By default, MySQL grants write locks before read locks when both are waiting. This can starve read queries on write-heavy MyISAM tables. The priority modifiers let you override this default behavior per query.

## HIGH_PRIORITY for SELECT

`HIGH_PRIORITY` raises a `SELECT` statement to run before pending write operations:

```sql
-- This SELECT runs before any queued INSERT or UPDATE waiting for the same table
SELECT HIGH_PRIORITY id, name, email
FROM myisam_log_table
WHERE event_date = CURDATE();
```

Use this when a read is time-critical and should not wait behind a queue of writes.

## LOW_PRIORITY for INSERT, UPDATE, DELETE

`LOW_PRIORITY` defers a write until no other session is reading the table:

```sql
-- INSERT waits until all current and pending reads complete
INSERT LOW_PRIORITY INTO myisam_log_table (event_type, message)
VALUES ('INFO', 'Background job completed');

-- UPDATE defers until readers are done
UPDATE LOW_PRIORITY myisam_stats
SET hit_count = hit_count + 1
WHERE page_id = 42;

-- DELETE defers until readers are done
DELETE LOW_PRIORITY FROM myisam_log_table
WHERE event_date < CURDATE() - INTERVAL 30 DAY;
```

## Combining Priority Modifiers

```sql
-- Critical read must not wait for queued background writes
SELECT HIGH_PRIORITY id, status FROM myisam_queue WHERE priority = 'URGENT';

-- Batch cleanup can wait indefinitely for reads to finish
DELETE LOW_PRIORITY FROM myisam_archive WHERE archived = 1 LIMIT 1000;
```

## InnoDB - Use Transactions Instead

On InnoDB tables, these modifiers have no effect. InnoDB handles concurrency through MVCC and row-level locks. Use transactions and isolation levels instead:

```sql
-- InnoDB: reads see a consistent snapshot, do not compete with writes
START TRANSACTION WITH CONSISTENT SNAPSHOT;
SELECT id, name FROM users WHERE status = 'ACTIVE';
COMMIT;

-- InnoDB: reduce lock contention with appropriate isolation level
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Server-Level Priority Settings

You can also change the default lock scheduling behavior at the server level:

```ini
[mysqld]
# Give reads higher priority than writes by default (MyISAM only)
low-priority-updates = 1
```

Or at the session level:

```sql
-- All writes in this session use LOW_PRIORITY by default
SET LOW_PRIORITY_UPDATES = 1;
INSERT INTO myisam_log_table (message) VALUES ('test');
```

## Checking Current Lock Status

```sql
-- View tables that currently have locks
SHOW OPEN TABLES WHERE In_use > 0;

-- Check MyISAM table lock contention
SHOW STATUS LIKE 'Table_locks_%';
-- Table_locks_immediate: locks granted immediately
-- Table_locks_waited: locks that had to wait
```

High `Table_locks_waited` on a MyISAM table indicates contention where priority modifiers could help.

## Summary

`HIGH_PRIORITY` and `LOW_PRIORITY` are MyISAM-specific hints that control how reads and writes are scheduled when competing for table-level locks. Use `HIGH_PRIORITY` on time-sensitive `SELECT` statements and `LOW_PRIORITY` on background writes to reduce read latency. For InnoDB tables, these hints have no effect - use MVCC, transactions, and appropriate isolation levels instead.
