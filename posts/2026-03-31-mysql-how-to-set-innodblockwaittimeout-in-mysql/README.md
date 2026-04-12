# How to Set innodb_lock_wait_timeout in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Locking, Configuration, Performance

Description: Learn how to configure innodb_lock_wait_timeout in MySQL to control how long transactions wait for row-level locks before timing out.

---

## What Is innodb_lock_wait_timeout?

`innodb_lock_wait_timeout` is a MySQL configuration variable that sets the maximum number of seconds a transaction waits for a row lock to be released before returning an error. The default value is 50 seconds.

When a transaction times out waiting for a lock, MySQL rolls back only the last statement that was waiting (not the full transaction), and returns:

```text
ERROR 1205 (HY000): Lock wait timeout exceeded; try restarting transaction
```

## Checking the Current Value

```sql
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';
```

Sample output:

```text
+--------------------------+-------+
| Variable_name            | Value |
+--------------------------+-------+
| innodb_lock_wait_timeout | 50    |
+--------------------------+-------+
```

## Setting the Timeout Globally

To change the timeout for all new connections without restarting MySQL:

```sql
SET GLOBAL innodb_lock_wait_timeout = 30;
```

This affects all connections established after the change but does not affect existing sessions.

## Setting the Timeout for the Current Session

To change the timeout only for the current session:

```sql
SET SESSION innodb_lock_wait_timeout = 10;
```

This is useful for batch jobs or API calls that should fail fast rather than waiting the full global timeout.

## Making the Setting Persistent

Add the variable to `my.cnf` (or `my.ini` on Windows) to persist it across server restarts:

```text
[mysqld]
innodb_lock_wait_timeout = 30
```

Restart MySQL to apply:

```bash
sudo systemctl restart mysql
```

## Rolling Back the Full Transaction on Timeout

By default, MySQL only rolls back the failing statement on lock timeout. To roll back the entire transaction instead, use the `innodb_rollback_on_timeout` variable:

```text
[mysqld]
innodb_lock_wait_timeout = 30
innodb_rollback_on_timeout = ON
```

Note: `innodb_rollback_on_timeout` is read-only at runtime and must be set in the config file.

## Practical Example

A common pattern is to set a short timeout for OLTP operations and a longer one for batch processing:

```sql
-- For a fast OLTP operation
SET SESSION innodb_lock_wait_timeout = 5;

START TRANSACTION;
UPDATE orders SET status = 'processing' WHERE id = 200;
COMMIT;
```

```sql
-- For a batch job
SET SESSION innodb_lock_wait_timeout = 120;

START TRANSACTION;
UPDATE orders SET status = 'archived' WHERE created_at < '2023-01-01';
COMMIT;
```

## Monitoring Lock Wait Events

Use the Performance Schema to see current lock waits:

```sql
SELECT
  OBJECT_NAME AS table_name,
  INDEX_NAME,
  LOCK_TYPE,
  LOCK_STATUS,
  LOCK_DATA
FROM performance_schema.data_locks
WHERE LOCK_STATUS = 'WAITING';
```

## Summary

`innodb_lock_wait_timeout` controls how long InnoDB transactions wait for row locks before aborting the waiting statement. Set it globally for a system-wide default, or per-session for specific workloads. Enable `innodb_rollback_on_timeout` if you need full transaction rollback on timeout instead of just statement rollback.
