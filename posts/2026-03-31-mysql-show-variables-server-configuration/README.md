# How to View Server Variables with SHOW VARIABLES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHOW VARIABLES, Configuration, Server Variable, Administration

Description: Use MySQL SHOW VARIABLES to inspect server configuration, filter variables by pattern, and understand the difference between session and global scope.

---

## Basic SHOW VARIABLES Syntax

`SHOW VARIABLES` displays the current values of MySQL server system variables:

```sql
-- Show all variables
SHOW VARIABLES;

-- Show only global variables
SHOW GLOBAL VARIABLES;

-- Show only session-level variables
SHOW SESSION VARIABLES;
```

## Filter Variables with LIKE

```sql
-- Find variables related to InnoDB buffer pool
SHOW VARIABLES LIKE 'innodb_buffer%';
```

```text
+-------------------------------------+-----------+
| Variable_name                       | Value     |
+-------------------------------------+-----------+
| innodb_buffer_pool_chunk_size       | 134217728 |
| innodb_buffer_pool_dump_at_shutdown | ON        |
| innodb_buffer_pool_filename         | ib_buffer_pool |
| innodb_buffer_pool_instances        | 1         |
| innodb_buffer_pool_load_at_startup  | ON        |
| innodb_buffer_pool_size             | 134217728 |
+-------------------------------------+-----------+
```

The `%` wildcard matches any sequence of characters.

## Use information_schema for Programmatic Access

`SHOW VARIABLES` is convenient for interactive use. For scripting or application queries, use the `performance_schema.global_variables` and `session_variables` tables:

```sql
-- Programmatic query with filtering
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME IN ('max_connections', 'wait_timeout', 'innodb_buffer_pool_size')
ORDER BY VARIABLE_NAME;
```

```text
+-------------------------+----------------+
| VARIABLE_NAME           | VARIABLE_VALUE |
+-------------------------+----------------+
| innodb_buffer_pool_size | 134217728      |
| max_connections         | 151            |
| wait_timeout            | 28800          |
+-------------------------+----------------+
```

## Understand Global vs Session Scope

Many variables have both a global and a session value. The session value is used for the current connection and may differ from the global default:

```sql
-- Show global value
SHOW GLOBAL VARIABLES LIKE 'sort_buffer_size';

-- Show current session value
SHOW SESSION VARIABLES LIKE 'sort_buffer_size';

-- Or equivalently (session is default)
SHOW VARIABLES LIKE 'sort_buffer_size';
```

When a session starts, it inherits the global value. If a DBA runs `SET SESSION sort_buffer_size = 8*1024*1024`, only that session is affected.

## Use performance_schema.variables_info for Source Information

MySQL 8.0 provides `performance_schema.variables_info` to show where each variable was last set:

```sql
SELECT
  v.VARIABLE_NAME,
  v.VARIABLE_VALUE,
  i.VARIABLE_SOURCE,
  i.SET_TIME
FROM performance_schema.global_variables v
JOIN performance_schema.variables_info i USING (VARIABLE_NAME)
WHERE v.VARIABLE_NAME LIKE 'innodb%pool%'
ORDER BY v.VARIABLE_NAME;
```

`VARIABLE_SOURCE` values:
- `COMPILED` - hardcoded default
- `GLOBAL` - set from a global option file (e.g., `/etc/my.cnf`)
- `PERSISTED` - set with `SET PERSIST` (stored in `mysqld-auto.cnf`)
- `COMMAND_LINE` - set via command-line option
- `DYNAMIC` - set at runtime with `SET GLOBAL` or `SET SESSION`

## Find Variables Different from Defaults

```sql
SELECT
  v.VARIABLE_NAME,
  v.VARIABLE_VALUE,
  i.VARIABLE_SOURCE
FROM performance_schema.global_variables v
JOIN performance_schema.variables_info i USING (VARIABLE_NAME)
WHERE i.VARIABLE_SOURCE != 'COMPILED'
ORDER BY i.VARIABLE_SOURCE, v.VARIABLE_NAME;
```

This shows all variables that have been changed from their compiled-in defaults.

## Useful SHOW VARIABLES Patterns

```sql
-- Connection limits
SHOW VARIABLES LIKE '%connections%';

-- Timeout settings
SHOW VARIABLES LIKE '%timeout%';

-- Binary logging
SHOW VARIABLES LIKE 'log_bin%';

-- Character set
SHOW VARIABLES LIKE '%charset%';

-- SSL/TLS
SHOW VARIABLES LIKE '%ssl%';
```

## Summary

`SHOW VARIABLES` is the primary command for inspecting MySQL server configuration. Use `LIKE` patterns to filter relevant variables. For scripts, prefer `performance_schema.global_variables`. In MySQL 8.0, `performance_schema.variables_info` provides the source and timestamp of each variable's last change, making it easier to audit configuration drift from compiled defaults.
