# How to Use GET_LOCK() and RELEASE_LOCK() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GET_LOCK, RELEASE_LOCK, Advisory Lock, Concurrency

Description: Learn how to use GET_LOCK() and RELEASE_LOCK() in MySQL to implement application-level advisory locks for coordinating concurrent processes.

---

## What Are Advisory Locks

MySQL's `GET_LOCK()` and `RELEASE_LOCK()` implement named advisory (user-level) locks. Unlike row locks or table locks, advisory locks are:

- Not tied to any database object
- Identified by a user-defined string name
- Used for coordination between application processes
- Session-scoped (released automatically when session ends)

## GET_LOCK()

```sql
GET_LOCK(lock_name, timeout)
```

Returns:
- `1` - lock acquired successfully
- `0` - timeout expired (another session holds the lock)
- `NULL` - error occurred

## RELEASE_LOCK()

```sql
RELEASE_LOCK(lock_name)
```

Returns:
- `1` - lock released successfully
- `0` - the lock exists but is held by another session
- `NULL` - the lock does not exist (was never acquired)

## Basic Usage

```sql
-- Acquire a lock, wait up to 10 seconds
SELECT GET_LOCK('my_process_lock', 10);

-- Do exclusive work here
SELECT 'Doing exclusive work...';

-- Release the lock
SELECT RELEASE_LOCK('my_process_lock');
```

## Checking Lock Ownership

```sql
-- Check who holds the lock
SELECT IS_USED_LOCK('my_process_lock');  -- Returns connection ID of owner, or NULL if free
SELECT IS_FREE_LOCK('my_process_lock');  -- Returns 1 if free, 0 if held
```

## Advisory Lock Pattern for Cron Jobs

Prevent multiple instances of a cron job from running simultaneously using a scheduled event:

```sql
DELIMITER //
CREATE EVENT cron_nightly_cleanup
ON SCHEDULE EVERY 1 DAY STARTS '2025-01-01 02:00:00'
DO
BEGIN
  DECLARE lock_acquired INT;

  SELECT GET_LOCK('cron_nightly_cleanup', 0) INTO lock_acquired;

  -- If 0, another instance is running
  IF lock_acquired = 1 THEN
    -- Perform the cleanup
    DELETE FROM temp_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

    -- Release the lock
    SELECT RELEASE_LOCK('cron_nightly_cleanup');
  END IF;
END //
DELIMITER ;
```

## Using Advisory Locks in a Stored Procedure

```sql
DELIMITER //
CREATE PROCEDURE run_exclusive_report()
BEGIN
  DECLARE lock_result INT;

  SELECT GET_LOCK('report_generator', 30) INTO lock_result;

  IF lock_result = 1 THEN
    -- Generate report
    INSERT INTO reports (name, generated_at)
    VALUES ('Monthly Summary', NOW());

    SELECT RELEASE_LOCK('report_generator');
    SELECT 'Report generated successfully' AS result;
  ELSE
    SELECT 'Report generation already in progress' AS result;
  END IF;
END //
DELIMITER ;
```

## Per-Connection Lock Name

Use `CONNECTION_ID()` for locks unique to the current session:

```sql
SET @my_lock = CONCAT('session_lock_', CONNECTION_ID());
SELECT GET_LOCK(@my_lock, 5);

-- Do session-specific work
SELECT RELEASE_LOCK(@my_lock);
```

## Advisory Locks in Application Code

In Python:

```python
def with_advisory_lock(cursor, lock_name, timeout=30):
    cursor.execute("SELECT GET_LOCK(%s, %s)", (lock_name, timeout))
    acquired = cursor.fetchone()[0]
    return acquired == 1

def release_advisory_lock(cursor, lock_name):
    cursor.execute("SELECT RELEASE_LOCK(%s)", (lock_name,))
    return cursor.fetchone()[0]

# Usage
if with_advisory_lock(cursor, 'batch_import', timeout=5):
    try:
        process_batch_import()
    finally:
        release_advisory_lock(cursor, 'batch_import')
else:
    print("Another import is in progress")
```

## Lock Behavior on Session End

If a session ends without releasing locks, MySQL automatically releases all advisory locks held by that session:

```sql
-- Session 1: acquire lock and disconnect without releasing
SELECT GET_LOCK('orphan_lock', 0);
-- Connection drops...

-- Session 2: lock is now free
SELECT IS_FREE_LOCK('orphan_lock');  -- Returns 1
```

## Multiple Locks per Session

A single session can hold multiple named locks (MySQL 5.7+):

```sql
SELECT GET_LOCK('lock_a', 10);
SELECT GET_LOCK('lock_b', 10);

-- Both locks held simultaneously
SELECT IS_FREE_LOCK('lock_a');  -- 0 (held)
SELECT IS_FREE_LOCK('lock_b');  -- 0 (held)

-- Release both
SELECT RELEASE_LOCK('lock_a');
SELECT RELEASE_LOCK('lock_b');
```

## Summary

`GET_LOCK(name, timeout)` and `RELEASE_LOCK(name)` implement named advisory locks for coordinating concurrent MySQL sessions and application processes. They are ideal for preventing duplicate cron job execution, serializing report generation, and implementing distributed mutexes. Locks are automatically released when a session disconnects. Use `IS_FREE_LOCK()` and `IS_USED_LOCK()` to inspect lock state without attempting acquisition.
