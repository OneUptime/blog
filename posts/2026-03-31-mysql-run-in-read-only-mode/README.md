# How to Run MySQL in Read-Only Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Read-Only, Replication, Administration, Security

Description: Learn how to enable MySQL read-only mode to protect replica servers, perform maintenance safely, and prevent accidental writes during planned operations.

---

## What Is MySQL Read-Only Mode?

MySQL `read_only` mode prevents non-privileged users from executing INSERT, UPDATE, DELETE, CREATE, DROP, and other write operations. It is essential for:
- Protecting read replicas from accidental writes that would break replication
- Performing maintenance on a primary without allowing new writes
- Running a database in a safe, locked-down state for reporting purposes

## Enabling Read-Only Mode at Runtime

Set `read_only` dynamically without a server restart:

```sql
SET GLOBAL read_only = ON;
```

Verify the change:

```sql
SHOW GLOBAL VARIABLES LIKE 'read_only';
```

```text
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| read_only     | ON    |
+---------------+-------+
```

Users with the `SUPER` privilege or `CONNECTION_ADMIN` privilege can still write even when `read_only = ON`. This allows replication threads and DBA users to operate normally.

## Making Read-Only Persistent

To persist read-only mode across restarts, add it to `my.cnf`:

```ini
[mysqld]
read_only = ON
```

This is the standard configuration for MySQL read replicas.

## Behavior of Read-Only Mode

With `read_only = ON`:
- Regular application users receive error 1290: `The MySQL server is running with the --read-only option`
- The replication SQL thread can still apply binary log events from the primary
- Users with SUPER or CONNECTION_ADMIN can still write
- Temporary tables can still be created (they are session-local)

Test the restriction with a regular user:

```sql
-- As application user (without SUPER privilege)
INSERT INTO orders (user_id, amount) VALUES (1, 99.99);
-- ERROR 1290 (HY000): The MySQL server is running with the --read-only option
```

## Disabling Read-Only Mode

To allow writes again:

```sql
SET GLOBAL read_only = OFF;
```

On a replica, this should be done with caution - if the application starts writing to the replica, it diverges from the primary and replication may break.

## Flushing Tables Before Enabling Read-Only

For maintenance operations, flush and lock tables first to ensure all writes are committed:

```sql
-- Step 1: Prevent new writes
FLUSH TABLES WITH READ LOCK;

-- Step 2: Enable read_only (belt and suspenders)
SET GLOBAL read_only = ON;

-- Step 3: Perform maintenance (backup, snapshot, etc.)

-- Step 4: Re-enable writes
SET GLOBAL read_only = OFF;
UNLOCK TABLES;
```

## Read-Only and Replication

Configure replicas with `read_only = ON` and `super_read_only = ON` to fully protect them:

```ini
[mysqld]
read_only = ON
super_read_only = ON
```

With `super_read_only = ON`, even users with SUPER privilege cannot write. Only the replication thread is exempted. This provides the strongest write protection for replicas.

## Monitoring Read-Only Status

In automated monitoring, alert if a primary server unexpectedly enters read-only mode:

```sql
SELECT VARIABLE_VALUE AS read_only_status
FROM performance_schema.global_variables
WHERE VARIABLE_NAME = 'read_only';
```

A primary server should always return `OFF` for `read_only`.

## Summary

Enable MySQL read-only mode with `SET GLOBAL read_only = ON` for temporary maintenance windows, or persist it in `my.cnf` for read replicas. Combine with `super_read_only = ON` to protect replicas from SUPER user writes. Always verify `read_only` status programmatically in your monitoring stack, and alert immediately if a primary transitions to read-only unexpectedly.
