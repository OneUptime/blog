# How to Persist Server Variables Across Restarts in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Configuration, SET PERSIST, Server Variable, Administration

Description: Use MySQL 8 SET PERSIST to permanently save server variable changes to mysqld-auto.cnf so they survive restarts without editing my.cnf manually.

---

## The Problem with SET GLOBAL

In MySQL 5.7 and earlier, `SET GLOBAL` changes were lost after a restart. DBAs had to remember to update `my.cnf` manually after every runtime change, which often led to configuration drift.

MySQL 8.0 introduced `SET PERSIST` to solve this problem.

## How SET PERSIST Works

When you use `SET PERSIST`, MySQL:
1. Applies the change to the running server immediately (like `SET GLOBAL`)
2. Writes the change to `mysqld-auto.cnf` (a JSON file in the MySQL data directory)
3. Reads `mysqld-auto.cnf` on every startup, applying persisted values after `my.cnf`

## Basic Syntax

```sql
-- Persist a variable change
SET PERSIST max_connections = 300;
SET PERSIST wait_timeout = 3600;
SET PERSIST innodb_buffer_pool_size = 2147483648;  -- 2 GB
```

## Check What Has Been Persisted

```sql
SELECT * FROM performance_schema.persisted_variables;
```

```text
+---------------------------+----------------+
| VARIABLE_NAME             | VARIABLE_VALUE |
+---------------------------+----------------+
| max_connections           | 300            |
| wait_timeout              | 3600           |
| innodb_buffer_pool_size   | 2147483648     |
+---------------------------+----------------+
```

## View the mysqld-auto.cnf File

The file is stored in the MySQL data directory:

```bash
sudo cat /var/lib/mysql/mysqld-auto.cnf
```

```json
{
    "Version": 1,
    "mysql_server": {
        "max_connections": {
            "Value": "300",
            "Metadata": {
                "Timestamp": 1743379200000000,
                "User": "root",
                "Host": "localhost"
            }
        },
        "wait_timeout": {
            "Value": "3600",
            "Metadata": {
                "Timestamp": 1743379200000000,
                "User": "root",
                "Host": "localhost"
            }
        }
    }
}
```

## Precedence: mysqld-auto.cnf vs my.cnf

Values in `mysqld-auto.cnf` override those in `my.cnf` if both exist. This means:

1. MySQL reads `my.cnf`
2. MySQL reads `mysqld-auto.cnf` and overrides any matching values

If you want `my.cnf` to take precedence again, you must reset the persisted value:

```sql
RESET PERSIST max_connections;
```

## Required Privileges

```sql
-- Require SYSTEM_VARIABLES_ADMIN and PERSIST_RO_VARIABLES_ADMIN
GRANT SYSTEM_VARIABLES_ADMIN, PERSIST_RO_VARIABLES_ADMIN ON *.* TO 'dba'@'%';
```

## Persist a Read-Only Variable

Some variables require `SET PERSIST_ONLY` because they are read-only at runtime - they take effect only after restart:

```sql
-- innodb_log_file_size cannot be changed at runtime
SET PERSIST_ONLY innodb_log_file_size = 536870912;  -- 512 MB
```

The change is written to `mysqld-auto.cnf` but does not affect the running server.

## Verify After Restart

After restarting MySQL, verify the variable took effect:

```bash
sudo systemctl restart mysql
```

```sql
SHOW GLOBAL VARIABLES LIKE 'max_connections';
-- Should show 300
```

## Summary

Use `SET PERSIST` in MySQL 8.0 to apply dynamic variable changes immediately and save them to `mysqld-auto.cnf` for persistence across restarts. Check persisted values with `SELECT * FROM performance_schema.persisted_variables`. Use `SET PERSIST_ONLY` for read-only variables that take effect after a restart. Remove persisted values with `RESET PERSIST variable_name` to let `my.cnf` values take effect again.
