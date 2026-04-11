# How to Use Session Variables vs Global Variables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Variable, Session, Global, Configuration

Description: Understand the difference between MySQL session and global system variables, when to use each, and how scope and persistence affect your database configuration.

---

## The Two Scopes of System Variables

MySQL system variables have two scopes:

- **Global** (`@@GLOBAL.var` or `GLOBAL var`): applies to the entire server and all connections that start after the change. Does not affect existing sessions.
- **Session** (`@@SESSION.var` or `SESSION var`): applies only to the current connection. Other connections are unaffected.

Some variables exist at both scopes, some only at one.

## Reading Variable Values

```sql
-- Read the global value
SELECT @@GLOBAL.max_connections;
SELECT @@GLOBAL.sort_buffer_size;

-- Read the session value
SELECT @@SESSION.sort_buffer_size;
SELECT @@SESSION.sql_mode;

-- Shorthand: returns session value if set, otherwise global
SELECT @@sort_buffer_size;
SELECT @@max_connections;
```

```sql
-- List all global variables
SHOW GLOBAL VARIABLES LIKE 'innodb%';

-- List all session variables
SHOW SESSION VARIABLES LIKE 'sort%';
```

## Setting Global Variables

Global changes affect all new connections. They require the `SYSTEM_VARIABLES_ADMIN` or `SUPER` privilege:

```sql
SET GLOBAL max_connections = 500;
SET @@GLOBAL.long_query_time = 2;
```

Global changes made with `SET GLOBAL` are lost on server restart. To persist them:

```sql
-- MySQL 8.0+: persist to mysqld-auto.cnf
SET PERSIST max_connections = 500;

-- Persist without applying to running server
SET PERSIST_ONLY innodb_buffer_pool_size = 4294967296;
```

## Setting Session Variables

Session changes take effect immediately for the current connection and are discarded when the session ends. No special privilege is required for most variables:

```sql
SET SESSION sort_buffer_size = 8388608;
SET @@SESSION.sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

-- SESSION keyword is optional for session scope
SET sort_buffer_size = 8388608;
```

## Practical Use Cases

### Session tuning for a heavy query

```sql
-- Temporarily increase buffers for a large report query
SET SESSION sort_buffer_size = 67108864;
SET SESSION tmp_table_size = 67108864;
SET SESSION max_heap_table_size = 67108864;

SELECT customer_id, SUM(total) FROM orders GROUP BY customer_id ORDER BY 2 DESC;

-- Reset to defaults when done
SET SESSION sort_buffer_size = DEFAULT;
SET SESSION tmp_table_size = DEFAULT;
SET SESSION max_heap_table_size = DEFAULT;
```

### Global tuning for server capacity

```sql
-- Increase server-wide connection limit
SET PERSIST max_connections = 300;

-- Adjust slow query log threshold globally
SET PERSIST long_query_time = 1;
```

## Variables That Are Global-Only

Some variables can only be set globally because they affect server-wide infrastructure:

```sql
-- innodb_buffer_pool_size, max_connections, table_open_cache
-- These cannot be set at session scope
SET SESSION max_connections = 100; -- ERROR
```

## Variables Commonly Set at Session Scope

Some variables have both global and session scope but are most often adjusted per-session:

```sql
SET SESSION time_zone = 'America/New_York';
SET SESSION autocommit = 0;
SET SESSION foreign_key_checks = 0;
```

## How Session Inherits from Global

When a new connection starts, its session variables are initialized from the current global values. Changing the global value after a session starts does not affect that session's existing value:

```sql
-- Before session A connects:
SET GLOBAL sort_buffer_size = 262144;

-- Session A is now connected with sort_buffer_size = 262144
-- Now change the global:
SET GLOBAL sort_buffer_size = 524288;

-- Session A still has 262144 until it explicitly changes it
SELECT @@SESSION.sort_buffer_size; -- returns 262144
```

## Summary

Global variables configure server-wide behavior and affect all new connections. Session variables tune the current connection only. Use `SET SESSION` for per-query optimization without impacting other users. Use `SET PERSIST` for durable global changes that survive restarts. Always check whether a variable supports both scopes before attempting to set it.
