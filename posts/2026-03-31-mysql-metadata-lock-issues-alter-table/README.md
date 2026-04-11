# How to Handle Metadata Lock Issues During ALTER TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Metadata Lock, ALTER TABLE, DDL, Migration

Description: Learn how to safely run ALTER TABLE in MySQL without getting blocked by metadata locks, using online DDL, pt-online-schema-change, and gh-ost.

---

## Overview

Running `ALTER TABLE` on a busy production table is one of the most common causes of MySQL outages. The operation requires an exclusive metadata lock, which blocks when any transaction holds an open read or write lock on the table. Understanding this behavior and using the right tools can make schema changes safe.

## Why ALTER TABLE Gets Blocked

The blocking sequence typically unfolds like this:

```text
1. Application has a long-running transaction (SELECT ... FOR UPDATE, uncommitted INSERT, etc.)
2. Your ALTER TABLE waits for MDL EXCLUSIVE lock
3. New application queries arrive and also get blocked (MDL pending queue)
4. Result: table is completely inaccessible
```

## Diagnosing the Blocker Before Running DDL

Always check for open transactions before running ALTER TABLE:

```sql
-- Check for long-running transactions
SELECT
    trx_id,
    trx_state,
    trx_started,
    TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS age_seconds,
    trx_query
FROM information_schema.innodb_trx
WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 10
ORDER BY age_seconds DESC;

-- Check current process list for idle transactions
SELECT id, user, host, db, command, time, state, info
FROM information_schema.processlist
WHERE command = 'Sleep'
  AND time > 30
ORDER BY time DESC;
```

## Using Online DDL to Minimize Locking

MySQL InnoDB supports online DDL for many ALTER TABLE operations:

```sql
-- Add a column without blocking reads and writes
ALTER TABLE orders
  ADD COLUMN notes TEXT COMMENT 'Order notes',
  ALGORITHM=INPLACE,
  LOCK=NONE;

-- Add an index online
ALTER TABLE orders
  ADD INDEX idx_customer_status (customer_id, status),
  ALGORITHM=INPLACE,
  LOCK=NONE;
```

Not all operations support `ALGORITHM=INPLACE, LOCK=NONE`. Check the MySQL documentation for the specific operation. Changing a column's data type, for example, requires a table rebuild.

## Setting a Timeout for the Alter

Prevent ALTER TABLE from blocking indefinitely by setting `lock_wait_timeout`:

```sql
-- ALTER TABLE will fail after 30 seconds if MDL cannot be acquired
SET SESSION lock_wait_timeout = 30;

ALTER TABLE orders ADD COLUMN notes TEXT, ALGORITHM=INPLACE, LOCK=NONE;
```

## Using pt-online-schema-change

Percona's `pt-online-schema-change` (pt-osc) performs schema changes without holding long locks:

```bash
# Install percona-toolkit
sudo apt-get install percona-toolkit

# Run an online schema change
pt-online-schema-change \
  --host=localhost \
  --user=admin \
  --password=secure_password \
  --alter="ADD COLUMN notes TEXT" \
  D=myapp,t=orders \
  --execute
```

pt-osc works by creating a shadow table, copying data in chunks, and using triggers to keep it in sync - requiring only brief locks at the final rename step.

## Using gh-ost for GitHub-Style Migrations

`gh-ost` is another popular zero-downtime DDL tool that uses the binary log instead of triggers:

```bash
gh-ost \
  --user="admin" \
  --password="secure_password" \
  --host=localhost \
  --database="myapp" \
  --table="orders" \
  --alter="ADD COLUMN notes TEXT" \
  --allow-on-master \
  --execute
```

## Killing Blocking Connections Safely

If you need to force the ALTER TABLE through, identify and kill blockers:

```sql
-- Get the blocking process ID and kill statement
SELECT
    blocking_pid,
    sql_kill_blocking_connection
FROM sys.schema_table_lock_waits;

-- Execute the kill
KILL CONNECTION 42;
```

## Summary

Handling metadata lock issues during ALTER TABLE requires a multi-layered approach: check for long-running transactions before starting, use `ALGORITHM=INPLACE, LOCK=NONE` for supported operations, set `lock_wait_timeout` to avoid indefinite waits, and use tools like `pt-online-schema-change` or `gh-ost` for tables that cannot tolerate even brief locks. For safety, always test schema changes in a staging environment first and schedule production changes during low-traffic windows.
