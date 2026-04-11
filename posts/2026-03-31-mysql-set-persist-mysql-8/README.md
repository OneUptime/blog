# How to Use SET PERSIST in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, DDL, Administration, System Variable

Description: SET PERSIST in MySQL 8 writes dynamic system variable changes to a configuration file so they survive server restarts, solving the temporary-change problem of SET GLOBAL.

---

## Overview

Before MySQL 8.0, when you used `SET GLOBAL` to change a system variable at runtime, the change was lost on the next server restart. To make it permanent, you also had to edit `my.cnf` manually - a two-step process prone to inconsistency. MySQL 8.0 introduced `SET PERSIST` and `SET PERSIST_ONLY` to solve this. `SET PERSIST` applies the change immediately and writes it to `mysqld-auto.cnf`, a JSON file in the data directory that MySQL reads on startup after `my.cnf`.

## SET PERSIST vs SET GLOBAL vs SET PERSIST_ONLY

| Command | Applies Now | Persists to File | Use Case |
| --- | --- | --- | --- |
| SET GLOBAL | Yes | No | Runtime change, lost on server restart |
| SET PERSIST | Yes | Yes | Permanent change taking effect immediately |
| SET PERSIST_ONLY | No | Yes | Change a read-only variable (takes effect after restart) |

## Basic Usage

Increase the maximum number of connections and make it permanent:

```sql
SET PERSIST max_connections = 500;
```

This is equivalent to running both:

```sql
SET GLOBAL max_connections = 500;
-- AND editing my.cnf
```

## Persisting Read-Only Variables

Some variables cannot be changed at runtime but can be set for the next restart:

```sql
-- innodb_buffer_pool_size can be changed dynamically in some versions,
-- but innodb_log_files_in_group requires a restart
SET PERSIST_ONLY innodb_log_files_in_group = 3;
```

The change is written to `mysqld-auto.cnf` but does not take effect until the server restarts.

## Viewing Persisted Variables

```sql
SELECT * FROM performance_schema.persisted_variables;
```

```text
+-----------------------------+------------+
| VARIABLE_NAME               | VALUE      |
+-----------------------------+------------+
| max_connections             | 500        |
| innodb_buffer_pool_size     | 4294967296 |
| slow_query_log              | ON         |
+-----------------------------+------------+
```

## The mysqld-auto.cnf File

```bash
cat /var/lib/mysql/mysqld-auto.cnf
```

```json
{
  "Version": 1,
  "mysql_server": {
    "max_connections": {
      "Value": "500",
      "Metadata": {
        "Timestamp": 1711900800000000,
        "User": "admin",
        "Host": "localhost"
      }
    }
  }
}
```

This file stores the author, timestamp, and value of each persisted setting for auditability.

## Removing a Persisted Variable

To remove a specific variable from `mysqld-auto.cnf` without changing its current runtime value:

```sql
RESET PERSIST max_connections;
```

To clear all persisted variables:

```sql
RESET PERSIST;
```

## Precedence Order

MySQL applies configuration in this order, with later sources taking precedence:

```text
compiled-in defaults
  -> my.cnf / my.ini
    -> mysqld-auto.cnf (SET PERSIST)
      -> command-line options
```

So `SET PERSIST` overrides `my.cnf` for the same variable.

## Practical Example: Tuning InnoDB on a Busy Server

```sql
-- Apply immediately and persist
SET PERSIST innodb_buffer_pool_size = 8589934592; -- 8GB
SET PERSIST innodb_flush_log_at_trx_commit = 1;
SET PERSIST slow_query_log = ON;
SET PERSIST long_query_time = 1;
SET PERSIST log_queries_not_using_indexes = ON;
```

All five changes survive the next restart and are documented with who made them and when.

## Required Privilege

The `SYSTEM_VARIABLES_ADMIN` privilege (or the deprecated `SUPER`) is required to use `SET PERSIST` and `SET PERSIST_ONLY`. To use `SET PERSIST_ONLY` on read-only (non-dynamic) variables, the `PERSIST_RO_VARIABLES_ADMIN` privilege is also required.

## Summary

`SET PERSIST` eliminates the split-brain problem of keeping `my.cnf` in sync with runtime configuration changes. By writing variable changes to `mysqld-auto.cnf` with metadata tracking, MySQL 8.0 gives administrators a reliable way to make durable configuration changes without editing files by hand. For teams managing multiple MySQL instances, this feature pairs well with configuration management tools and makes ad-hoc tuning changes reproducible and auditable.
