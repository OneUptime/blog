# How to Use System Variables (@@var) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, System Variable, Configuration, Administration

Description: Learn how to read and modify MySQL system variables (@@var) at both global and session levels to tune server behavior.

---

## What Are System Variables

MySQL system variables are server configuration parameters prefixed with `@@`. They control the behavior of the MySQL server such as buffer sizes, timeout values, SQL modes, and character sets.

There are two scopes:
- `@@GLOBAL` - affects all connections; persists until server restart (unless set in config file)
- `@@SESSION` - affects only the current connection; reverts when session ends

Shorthand `@@var_name` defaults to the session value if one exists, otherwise the global value.

## Reading System Variables

```sql
-- Read a specific system variable
SELECT @@max_connections;
SELECT @@SESSION.wait_timeout;
SELECT @@GLOBAL.max_allowed_packet;

-- Using SHOW VARIABLES
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE '%timeout%';
SHOW GLOBAL VARIABLES LIKE 'innodb_buffer%';
```

## Setting System Variables

Requires appropriate privileges (SUPER or SYSTEM_VARIABLES_ADMIN):

```sql
-- Set session variable
SET @@SESSION.wait_timeout = 300;
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE';

-- Set global variable
SET @@GLOBAL.max_connections = 500;
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
```

## Commonly Used System Variables

### Connection and Timeout Settings

```sql
-- View timeout-related variables
SHOW VARIABLES LIKE '%timeout%';

-- Set interactive timeout
SET @@SESSION.interactive_timeout = 600;

-- Set wait_timeout (non-interactive)
SET @@SESSION.wait_timeout = 600;
```

### Character Set and Collation

```sql
SELECT @@character_set_client, @@character_set_connection, @@collation_connection;

SET NAMES utf8mb4;
-- Equivalent to:
SET @@SESSION.character_set_client = utf8mb4;
SET @@SESSION.character_set_results = utf8mb4;
SET @@SESSION.character_set_connection = utf8mb4;
```

### SQL Mode

```sql
SELECT @@sql_mode;

-- Enable strict mode for current session
SET @@SESSION.sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';
```

### Buffer and Memory Settings

```sql
SELECT @@innodb_buffer_pool_size;
SELECT @@sort_buffer_size;
SELECT @@join_buffer_size;

-- Increase sort buffer for a specific session
SET @@SESSION.sort_buffer_size = 4194304; -- 4MB
```

### Auto-increment Settings

```sql
SELECT @@auto_increment_increment;
SELECT @@auto_increment_offset;

-- Useful in multi-master replication
SET @@GLOBAL.auto_increment_increment = 2;
SET @@GLOBAL.auto_increment_offset = 1;
```

## Checking Variable Types

Use `SHOW VARIABLES` with `LIKE` to explore available variables:

```sql
SHOW GLOBAL VARIABLES LIKE 'innodb%';
SHOW SESSION VARIABLES LIKE 'sql%';
```

Or query the `performance_schema`:

```sql
SELECT vi.variable_name, gv.variable_value, vi.variable_source
FROM performance_schema.variables_info vi
JOIN performance_schema.global_variables gv
  ON vi.variable_name = gv.variable_name
WHERE vi.variable_name LIKE 'max_%'
ORDER BY vi.variable_name;
```

## Persisting Variable Changes Across Restarts

In MySQL 8.0+, use `SET PERSIST` to write the change to `mysqld-auto.cnf`:

```sql
SET PERSIST max_connections = 500;
SET PERSIST_ONLY innodb_buffer_pool_size = 2147483648;
```

`PERSIST` takes effect immediately and persists. `PERSIST_ONLY` only writes to the config file (for variables that need a restart).

## Summary

MySQL system variables (`@@var`) control server behavior at global and session scopes. Use `SHOW VARIABLES` to inspect them and `SET` to modify them. In MySQL 8.0+, `SET PERSIST` makes changes survive server restarts. Session-level changes only affect the current connection, while global changes affect all new connections.
