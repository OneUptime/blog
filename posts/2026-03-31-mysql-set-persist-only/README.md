# How to Use SET PERSIST_ONLY in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SET PERSIST_ONLY, Configuration, MySQL 8, Read-Only Variable

Description: Use MySQL 8 SET PERSIST_ONLY to save read-only or non-dynamic variable changes to mysqld-auto.cnf so they take effect on the next server restart.

---

## What Is SET PERSIST_ONLY

`SET PERSIST_ONLY` writes a variable value to `mysqld-auto.cnf` without applying it to the running server. It is used for:

- **Read-only variables** that cannot be changed at runtime (only take effect after restart)
- **Dynamic variables** that you want to schedule for the next restart without changing the current behavior

This is different from `SET PERSIST`, which applies changes immediately AND writes to the file.

## Syntax

```sql
SET PERSIST_ONLY variable_name = value;
```

## Common Read-Only Variables Changed with SET PERSIST_ONLY

```sql
-- InnoDB redo log size (requires restart)
SET PERSIST_ONLY innodb_log_file_size = 536870912;  -- 512 MB

-- Number of InnoDB log files
SET PERSIST_ONLY innodb_log_files_in_group = 2;

-- Number of InnoDB buffer pool instances (requires restart)
SET PERSIST_ONLY innodb_buffer_pool_instances = 8;

-- Change the data directory (requires restart)
-- SET PERSIST_ONLY datadir = '/new/data/dir';  -- use with caution

-- InnoDB page size (requires fresh initialization - for reference only)
-- SET PERSIST_ONLY innodb_page_size = 16384;
```

## Verify the Value Was Written

```sql
-- Check that the value appears in persisted_variables
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.persisted_variables
WHERE VARIABLE_NAME = 'innodb_log_file_size';
```

```text
+----------------------+----------------+
| VARIABLE_NAME        | VARIABLE_VALUE |
+----------------------+----------------+
| innodb_log_file_size | 536870912      |
+----------------------+----------------+
```

The current runtime value is unchanged:

```sql
SHOW GLOBAL VARIABLES LIKE 'innodb_log_file_size';
-- Still shows the old value - the change takes effect after restart
```

## Apply the Change

Restart MySQL to apply the persisted value:

```bash
sudo systemctl restart mysql
```

After restart:

```sql
SHOW GLOBAL VARIABLES LIKE 'innodb_log_file_size';
```

```text
+----------------------+-----------+
| Variable_name        | Value     |
+----------------------+-----------+
| innodb_log_file_size | 536870912 |
+----------------------+-----------+
```

## Check Variable Source After Restart

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE, VARIABLE_SOURCE
FROM performance_schema.global_variables v
JOIN performance_schema.variables_info i USING (VARIABLE_NAME)
WHERE VARIABLE_NAME = 'innodb_log_file_size';
```

```text
+----------------------+----------------+-----------------+
| VARIABLE_NAME        | VARIABLE_VALUE | VARIABLE_SOURCE |
+----------------------+----------------+-----------------+
| innodb_log_file_size | 536870912      | PERSISTED       |
+----------------------+----------------+-----------------+
```

`VARIABLE_SOURCE = PERSISTED` confirms the value came from `mysqld-auto.cnf`.

## Required Privileges

`SET PERSIST_ONLY` requires `SYSTEM_VARIABLES_ADMIN` and `PERSIST_RO_VARIABLES_ADMIN`:

```sql
GRANT SYSTEM_VARIABLES_ADMIN, PERSIST_RO_VARIABLES_ADMIN ON *.* TO 'dba'@'%';
```

`PERSIST_RO_VARIABLES_ADMIN` is specifically required for read-only variables.

## Remove a PERSIST_ONLY Value

```sql
-- Remove from mysqld-auto.cnf so the value comes from my.cnf on next restart
RESET PERSIST innodb_log_file_size;
```

## When to Use SET PERSIST_ONLY vs SET PERSIST

| Scenario | Use |
|----------|-----|
| Change takes effect immediately AND persists | `SET PERSIST` |
| Read-only variable, change on next restart | `SET PERSIST_ONLY` |
| Dynamic variable, apply on next restart only | `SET PERSIST_ONLY` |
| Change only this session | `SET SESSION` |

## Summary

`SET PERSIST_ONLY` writes variable values to `mysqld-auto.cnf` without changing the running server. Use it for read-only variables like `innodb_log_file_size` that require a restart, or when you want to schedule a dynamic variable change for the next maintenance window. Verify changes with `performance_schema.persisted_variables` and remove them with `RESET PERSIST`.
