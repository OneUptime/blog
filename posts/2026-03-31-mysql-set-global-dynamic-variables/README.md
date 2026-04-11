# How to Set Server Variables Dynamically with SET GLOBAL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SET GLOBAL, Configuration, Dynamic Variable, Administration

Description: Use MySQL SET GLOBAL to change server variables at runtime without a restart, understand which variables are dynamic, and avoid common mistakes.

---

## What Is SET GLOBAL

`SET GLOBAL` changes a MySQL system variable for all new sessions without restarting the server. Dynamic variables can be changed this way and take effect immediately for new connections. Existing sessions retain their current values until they start a new session or explicitly change their session variable.

## Syntax

```sql
-- Set a single variable
SET GLOBAL max_connections = 300;

-- Set multiple variables at once
SET GLOBAL max_connections = 300,
    GLOBAL wait_timeout = 3600,
    GLOBAL sort_buffer_size = 2097152;
```

## Required Privileges

Setting global variables requires the `SYSTEM_VARIABLES_ADMIN` privilege or the deprecated `SUPER` privilege:

```sql
-- Grant the required privilege
GRANT SYSTEM_VARIABLES_ADMIN ON *.* TO 'dba'@'%';
```

## Verify the Change

```sql
-- Check the new global value
SHOW GLOBAL VARIABLES LIKE 'max_connections';

-- Or use performance_schema (MySQL 8.0+)
SELECT VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME = 'max_connections';
```

## Important: Changes Are Lost on Restart

`SET GLOBAL` changes are in-memory only. After a MySQL restart, the server reads `my.cnf` and resets all variables to their configured values. Always update `my.cnf` after making a `SET GLOBAL` change you want to persist:

```bash
# Edit my.cnf to persist the change
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
[mysqld]
max_connections = 300
```

In MySQL 8.0, use `SET PERSIST` instead to automatically update the configuration file.

## Which Variables Are Dynamic

Not all system variables can be changed at runtime. Check which variables were changed dynamically with:

```sql
SELECT VARIABLE_NAME, VARIABLE_SOURCE, SET_TIME, SET_USER
FROM performance_schema.variables_info
WHERE VARIABLE_NAME LIKE 'innodb%buffer%'
ORDER BY VARIABLE_NAME;
```

Try to set a non-dynamic variable:

```sql
-- This will fail - innodb_data_home_dir is not a dynamic variable
SET GLOBAL innodb_data_home_dir = '/var/lib/mysql/data';
-- ERROR 1238 (HY000): Variable 'innodb_data_home_dir' is a read only variable
```

## Common Dynamic Variables

```sql
-- Connection management
SET GLOBAL max_connections = 300;
SET GLOBAL wait_timeout = 600;
SET GLOBAL interactive_timeout = 600;

-- Memory buffers
SET GLOBAL sort_buffer_size = 2097152;
SET GLOBAL join_buffer_size = 2097152;
SET GLOBAL tmp_table_size = 67108864;
SET GLOBAL max_heap_table_size = 67108864;

-- InnoDB settings
SET GLOBAL innodb_buffer_pool_size = 2147483648;
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
SET GLOBAL innodb_io_capacity = 400;

-- Query execution
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;
```

## Session vs Global Scope

Some variables have both session and global scope. SET GLOBAL affects new sessions; SET SESSION affects only the current connection:

```sql
-- Change for all new connections
SET GLOBAL sort_buffer_size = 4194304;

-- Change only for this connection
SET SESSION sort_buffer_size = 33554432;

-- Revert session to global value
SET SESSION sort_buffer_size = DEFAULT;
```

## Audit Dynamic Changes

MySQL 8.0 records when variables were changed:

```sql
SELECT
  VARIABLE_NAME,
  VARIABLE_VALUE,
  SET_USER,
  SET_HOST,
  SET_TIME
FROM performance_schema.variables_info
WHERE VARIABLE_SOURCE = 'DYNAMIC'
ORDER BY SET_TIME DESC
LIMIT 20;
```

## Summary

Use `SET GLOBAL variable_name = value` to change dynamic MySQL variables at runtime without a server restart. Changes are immediate but lost on restart. Always update `my.cnf` or use `SET PERSIST` (MySQL 8.0) to make changes permanent. Check `performance_schema.variables_info` to see which user made a change and when.
