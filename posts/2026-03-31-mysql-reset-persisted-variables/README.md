# How to Reset Persisted Variables in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, RESET PERSIST, Configuration, MySQL 8, Administration

Description: Use MySQL 8 RESET PERSIST to remove persisted variable values from mysqld-auto.cnf, reverting control to my.cnf or compiled defaults on next restart.

---

## Why You Need RESET PERSIST

When you use `SET PERSIST` or `SET PERSIST_ONLY`, values are stored in `mysqld-auto.cnf`. These values override `my.cnf` at startup. To let `my.cnf` (or compiled defaults) take control again, you must remove the entry from `mysqld-auto.cnf` using `RESET PERSIST`.

Common reasons to reset persisted variables:

- Reverting a change that caused problems
- Cleaning up after testing
- Migrating configuration to `my.cnf` for version-controlled management
- Removing all persisted values before a server migration

## Reset a Single Variable

```sql
-- Remove max_connections from mysqld-auto.cnf
RESET PERSIST max_connections;
```

The currently running server is unaffected. On the next restart, `max_connections` will be read from `my.cnf` or use the compiled default.

## Reset All Persisted Variables

```sql
-- Remove ALL entries from mysqld-auto.cnf
RESET PERSIST;
```

This empties `mysqld-auto.cnf` completely. After the next restart, all values come from `my.cnf` or compiled defaults.

## Verify Before Resetting

Check which variables are currently persisted:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.persisted_variables
ORDER BY VARIABLE_NAME;
```

```text
+---------------------------+----------------+
| VARIABLE_NAME             | VARIABLE_VALUE |
+---------------------------+----------------+
| innodb_buffer_pool_size   | 2147483648     |
| max_connections           | 500            |
| wait_timeout              | 1800           |
+---------------------------+----------------+
```

To see who set each variable and when, join with `performance_schema.variables_info`:

```sql
SELECT p.VARIABLE_NAME, p.VARIABLE_VALUE, v.SET_USER, v.SET_TIME
FROM performance_schema.persisted_variables p
JOIN performance_schema.variables_info v
  ON p.VARIABLE_NAME = v.VARIABLE_NAME
ORDER BY p.VARIABLE_NAME;
```

## Reset Multiple Specific Variables

```sql
-- Remove multiple variables individually
RESET PERSIST wait_timeout;
RESET PERSIST max_connections;
```

There is no multi-variable syntax for `RESET PERSIST` other than using it individually or resetting all at once.

## What Happens to the Running Server

`RESET PERSIST` only modifies `mysqld-auto.cnf`. It does not change any currently running server variable. The change takes effect on the next restart:

```sql
-- Before reset: value is 500 (persisted)
SHOW GLOBAL VARIABLES LIKE 'max_connections';

-- Reset the persisted value
RESET PERSIST max_connections;

-- Still 500 in the running server
SHOW GLOBAL VARIABLES LIKE 'max_connections';
-- After restart, will use my.cnf value or default (151)
```

## Handle "Variable Does Not Exist in Persisted Configuration"

If you try to reset a variable that is not persisted, MySQL returns an error:

```sql
RESET PERSIST sort_buffer_size;
```

```text
ERROR 3615 (HY000): Variable sort_buffer_size does not exist in persisted config file
```

Use `IF EXISTS` to suppress the error and produce a warning instead:

```sql
RESET PERSIST IF EXISTS sort_buffer_size;
```

## Inspect mysqld-auto.cnf Directly

The file is in the MySQL data directory:

```bash
sudo cat /var/lib/mysql/mysqld-auto.cnf
```

After `RESET PERSIST`, the file will be empty or contain only remaining persisted variables:

```json
{
    "Version": 1,
    "mysql_server": {}
}
```

## Required Privileges

```sql
-- SYSTEM_VARIABLES_ADMIN is required for dynamic variables
GRANT SYSTEM_VARIABLES_ADMIN ON *.* TO 'dba'@'%';

-- PERSIST_RO_VARIABLES_ADMIN is also required for read-only variables
GRANT PERSIST_RO_VARIABLES_ADMIN ON *.* TO 'dba'@'%';
```

## Summary

Use `RESET PERSIST variable_name` to remove a single persisted variable from `mysqld-auto.cnf`, or `RESET PERSIST` (no arguments) to clear all persisted values. The running server is unaffected - changes take effect on the next restart. Use `RESET PERSIST IF EXISTS` to avoid errors for variables that were not persisted. Always verify what is persisted with `SELECT * FROM performance_schema.persisted_variables` before performing a bulk reset.
