# How to Use SHOW VARIABLES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, Administration

Description: Learn how to use SHOW VARIABLES in MySQL to inspect server configuration, filter settings by pattern, and identify tunable parameters.

---

## What Is SHOW VARIABLES

`SHOW VARIABLES` displays the values of MySQL system variables - the configuration parameters that control server behavior. There are hundreds of variables covering memory allocation, timeouts, replication, character sets, InnoDB tuning, and more. Understanding these variables is essential for performance tuning, troubleshooting, and validating configuration changes.

```sql
SHOW VARIABLES;
SHOW VARIABLES LIKE 'pattern';
SHOW VARIABLES WHERE Variable_name = 'exact_name';
SHOW GLOBAL VARIABLES;
SHOW SESSION VARIABLES;
```

## Global vs Session Variables

MySQL variables have two scopes:

- **Global**: Apply to the entire server, set with `SET GLOBAL`
- **Session**: Apply only to the current connection, set with `SET SESSION` or `SET`

```sql
-- See global server-wide settings
SHOW GLOBAL VARIABLES LIKE 'max_connections';

-- See session-specific settings (may differ from global)
SHOW SESSION VARIABLES LIKE 'max_connections';
```

Without specifying `GLOBAL` or `SESSION`, `SHOW VARIABLES` defaults to session scope.

## Common Variable Lookups

Check maximum connections:

```sql
SHOW VARIABLES LIKE 'max_connections';
```

Check InnoDB buffer pool size:

```sql
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
```

Check query cache settings (removed in MySQL 8.0):

```sql
SHOW VARIABLES LIKE 'query_cache%';
```

Check binary logging:

```sql
SHOW VARIABLES LIKE 'log_bin%';
```

## Pattern Filtering with LIKE

```sql
-- All InnoDB-related variables
SHOW VARIABLES LIKE 'innodb%';

-- All timeout settings
SHOW VARIABLES LIKE '%timeout%';

-- Character set and collation settings
SHOW VARIABLES LIKE 'character_set%';
SHOW VARIABLES LIKE 'collation%';

-- Slow query log settings
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

## Key Variables for Performance Tuning

```sql
-- Memory settings
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';
SHOW VARIABLES LIKE 'innodb_log_file_size';
SHOW VARIABLES LIKE 'sort_buffer_size';
SHOW VARIABLES LIKE 'join_buffer_size';
SHOW VARIABLES LIKE 'read_buffer_size';

-- Connection limits
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'wait_timeout';
SHOW VARIABLES LIKE 'interactive_timeout';

-- Replication
SHOW VARIABLES LIKE 'binlog_format';
SHOW VARIABLES LIKE 'sync_binlog';
SHOW VARIABLES LIKE 'gtid_mode';
```

## Reading Variables from performance_schema

For programmatic access:

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME LIKE 'innodb%'
ORDER BY VARIABLE_NAME;
```

## Changing Variables at Runtime

Many variables can be changed without restarting MySQL:

```sql
-- Change max connections globally
SET GLOBAL max_connections = 500;

-- Verify the change
SHOW GLOBAL VARIABLES LIKE 'max_connections';

-- Change session timeout for current connection only
SET SESSION wait_timeout = 300;
```

## Finding Non-Default Variables

To see which variables differ from defaults (useful after tuning):

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME IN (
  'max_connections', 'innodb_buffer_pool_size',
  'slow_query_log', 'long_query_time', 'sync_binlog'
);
```

## Persisting Variable Changes

In MySQL 8.0+, use `SET PERSIST` to save changes to `mysqld-auto.cnf` so they survive restarts:

```sql
SET PERSIST max_connections = 500;
SET PERSIST innodb_buffer_pool_size = 4294967296;  -- 4GB
```

To remove a persisted variable:

```sql
RESET PERSIST max_connections;
```

## Summary

`SHOW VARIABLES` is the essential command for inspecting MySQL server configuration. Use `LIKE` patterns to filter by topic area, specify `GLOBAL` or `SESSION` scope as needed, and use `SET PERSIST` in MySQL 8 to make runtime changes permanent. The `performance_schema.global_variables` table provides programmatic access to the same data.
