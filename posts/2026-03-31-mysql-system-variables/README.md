# What Is a System Variable in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, System Variable, Configuration, Session, Global

Description: MySQL system variables are server configuration parameters that control runtime behavior, accessible at global or session scope using SHOW VARIABLES and SET statements.

---

## Overview

System variables in MySQL are built-in configuration parameters that control the behavior of the MySQL server. Unlike user-defined variables (which start with `@`), system variables are predefined by MySQL and cover everything from memory allocation to character encoding to query execution behavior.

System variables can have two scopes:

- **Global scope** - affects the entire server and all new connections
- **Session scope** - affects only the current connection

Some variables are available at both scopes, while others are global-only or session-only.

## Viewing System Variables

```sql
-- Show all system variables
SHOW VARIABLES;

-- Filter by pattern
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'innodb%';

-- Using performance_schema
SELECT variable_name, variable_value
FROM performance_schema.global_variables
WHERE variable_name LIKE 'innodb_buffer_pool%';
```

## Reading a Specific System Variable

```sql
SELECT @@global.max_connections;
SELECT @@session.sql_mode;

-- Shorthand (defaults to session, falls back to global)
SELECT @@max_connections;
```

## Setting System Variables

```sql
-- Set globally (affects all new connections, not current ones)
SET GLOBAL max_connections = 500;

-- Set for current session only
SET SESSION sort_buffer_size = 4194304;

-- Shorthand
SET @@global.max_connections = 500;
SET @@session.sort_buffer_size = 4194304;
```

Global changes made with `SET GLOBAL` take effect immediately but do not survive a server restart unless also set in the configuration file.

## Persisting System Variables

MySQL 8.0 introduced `SET PERSIST` to write a variable change both to the running server and to `mysqld-auto.cnf`, so it survives restarts:

```sql
SET PERSIST max_connections = 500;

-- Persist without applying to the running server
SET PERSIST_ONLY innodb_buffer_pool_size = 2147483648;
```

To remove a persisted variable:

```sql
RESET PERSIST max_connections;
```

## Common System Variables

```sql
-- Check buffer pool size
SELECT @@innodb_buffer_pool_size;

-- Check current SQL mode
SELECT @@sql_mode;

-- Check slow query log threshold
SELECT @@long_query_time;

-- Check connection timeout
SELECT @@wait_timeout;
```

## Dynamic vs Non-Dynamic Variables

Variables are either dynamic (changeable at runtime) or non-dynamic (requiring a restart):

```sql
-- Find variables that have been changed from their compiled defaults
SELECT variable_name, variable_source
FROM performance_schema.variables_info
WHERE variable_source != 'COMPILED'
LIMIT 10;
```

Non-dynamic variables like `innodb_buffer_pool_size` (in older versions) require a my.cnf change and restart, though many became dynamic in MySQL 8.0.

## System Variables in my.cnf

System variables set in the configuration file use underscores or hyphens:

```text
[mysqld]
max_connections = 500
innodb_buffer_pool_size = 2G
slow_query_log = ON
long_query_time = 1
```

## Summary

MySQL system variables are the primary mechanism for configuring server behavior at runtime. They offer global and session scopes, allowing fine-grained control over individual connections or the entire server. The `SET PERSIST` feature in MySQL 8.0 closes the gap between runtime changes and configuration file settings, making system variable management more reliable in production environments.