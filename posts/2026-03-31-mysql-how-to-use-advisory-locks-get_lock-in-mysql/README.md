# How to Use Advisory Locks (GET_LOCK) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Advisory Lock, GET_LOCK, Concurrency, Application Locking

Description: Learn how to use MySQL advisory locks with GET_LOCK and RELEASE_LOCK to coordinate concurrent processes at the application level.

---

## What Are Advisory Locks?

Advisory locks (also called user-level or named locks) are application-defined locks that are not tied to any table or row. MySQL provides them through the `GET_LOCK()`, `RELEASE_LOCK()`, and related functions. They are "advisory" because MySQL itself does not enforce them - it is up to your application code to check and respect them.

Advisory locks are useful for coordinating distributed processes, preventing duplicate background jobs, or serializing work that cannot be handled by row-level locking.

## Core Functions

| Function | Description |
|----------|-------------|
| `GET_LOCK(name, timeout)` | Tries to acquire a named lock for `timeout` seconds. Returns 1 if successful, 0 if timed out, NULL on error. |
| `RELEASE_LOCK(name)` | Releases the named lock. Returns 1 if released, 0 if not held by this session, NULL if the lock does not exist. |
| `IS_FREE_LOCK(name)` | Returns 1 if the lock is available, 0 if held. |
| `IS_USED_LOCK(name)` | Returns the connection ID holding the lock, or NULL if free. |
| `RELEASE_ALL_LOCKS()` | Releases all named locks held by the session. |

## Basic Usage

```sql
-- Acquire a lock (wait up to 10 seconds)
SELECT GET_LOCK('my_job_lock', 10);

-- Check the result before proceeding
-- 1 = acquired, 0 = timed out, NULL = error

-- Do your critical work here
-- ...

-- Release the lock when done
SELECT RELEASE_LOCK('my_job_lock');
```

## Using Advisory Locks in a Stored Procedure

```sql
DELIMITER $$
CREATE PROCEDURE run_nightly_report()
BEGIN
  DECLARE lock_result INT;

  -- Try to acquire the lock
  SET lock_result = GET_LOCK('nightly_report', 0);

  IF lock_result = 1 THEN
    -- We have the lock - safe to run
    CALL generate_report_data();
    SELECT RELEASE_LOCK('nightly_report');
  ELSEIF lock_result = 0 THEN
    -- Another session holds the lock
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Report already running in another session';
  ELSE
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Error acquiring lock';
  END IF;
END$$
DELIMITER ;
```

## Application-Level Usage Pattern

Advisory locks are most commonly used from application code to prevent concurrent execution of critical sections:

```sql
-- Python-style pseudocode using a MySQL connection
-- connection.execute("SELECT GET_LOCK('process_invoices', 30)")
-- result = connection.fetchone()[0]
-- if result == 1:
--     process_invoices()
--     connection.execute("SELECT RELEASE_LOCK('process_invoices')")
-- else:
--     log("Could not acquire lock - another process is running")
```

In actual Python with mysql-connector:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='app', password='secret', database='mydb')
cursor = conn.cursor()

cursor.execute("SELECT GET_LOCK('invoice_processor', 30)")
result = cursor.fetchone()[0]

if result == 1:
    try:
        # critical section
        cursor.execute("CALL process_invoices()")
        conn.commit()
    finally:
        cursor.execute("SELECT RELEASE_LOCK('invoice_processor')")
else:
    print("Another process is already running")

cursor.close()
conn.close()
```

## Checking Lock Status

```sql
-- Is the lock free?
SELECT IS_FREE_LOCK('nightly_report');
-- 1 = free, 0 = held by someone

-- Who holds the lock?
SELECT IS_USED_LOCK('nightly_report');
-- Returns the connection ID of the holder, or NULL if free

-- List all named locks currently held
SELECT
  OBJECT_NAME AS lock_name,
  OWNER_THREAD_ID AS thread_id
FROM performance_schema.metadata_locks
WHERE OBJECT_TYPE = 'USER LEVEL LOCK';
```

## Important Behaviors and Gotchas

**Lock scope is per-connection, not per-transaction:** Advisory locks are held by the database connection (session), not the transaction. Rolling back a transaction does NOT release advisory locks.

```sql
START TRANSACTION;
SELECT GET_LOCK('my_lock', 10);
ROLLBACK;
-- 'my_lock' is STILL held after rollback
SELECT RELEASE_LOCK('my_lock');  -- must release explicitly
```

**A session can hold multiple named locks:** Since MySQL 5.7.5, a session can hold multiple distinct named locks simultaneously.

```sql
SELECT GET_LOCK('lock_a', 5);
SELECT GET_LOCK('lock_b', 5);
-- Both are now held by this session
SELECT RELEASE_ALL_LOCKS();  -- releases both
```

**Lock names are case-insensitive:** `GET_LOCK('MyLock', 5)` and `GET_LOCK('mylock', 5)` refer to the same lock. Internally, MySQL converts lock names to lowercase before using them as keys.

**If the connection is lost, all named locks are automatically released.** This prevents orphaned locks.

## Use Cases

- **Preventing duplicate cron jobs:** Acquire a lock at the start of a scheduled task; if it cannot be acquired, another instance is already running.
- **Coordinating multi-step migrations:** Lock to prevent two migration scripts from running concurrently.
- **Application-level queue processing:** Serialize processing of a specific entity (e.g., `GET_LOCK(CONCAT('user_', user_id), 5)`) to avoid race conditions.

## Summary

MySQL advisory locks via `GET_LOCK()` provide a flexible, application-level coordination mechanism that does not depend on table or row locking. They are ideal for preventing duplicate background job execution and serializing work that spans multiple transactions. Remember that these locks are tied to the database connection, not the transaction, so always release them explicitly and verify the return value before entering a critical section.
