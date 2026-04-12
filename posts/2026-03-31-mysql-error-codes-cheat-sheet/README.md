# MySQL Error Codes Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error Code, Troubleshooting, Cheat Sheet

Description: Quick reference for the most common MySQL error codes with causes and fixes, covering connection errors, constraint violations, locking, and replication errors.

---

## Error Code Format

MySQL errors have two identifiers:

```text
MySQL error number: 1045
SQLSTATE code:      28000
Message:            Access denied for user 'alice'@'localhost'
```

## Connection Errors

```text
1040 - Too many connections
       Fix: Increase max_connections or reduce idle connections (wait_timeout)

1045 - Access denied for user
       Fix: Check username, password, host; run SHOW GRANTS FOR user@host

1130 - Host 'x.x.x.x' is not allowed to connect
       Fix: Grant privileges for the specific host or '%'

2002 - Can't connect to local MySQL server through socket
       Fix: Check mysqld is running; verify socket path in my.cnf

2003 - Can't connect to MySQL server on 'host' (errno: 111)
       Fix: Check bind-address, firewall rules, and port 3306
```

## Authentication Errors

```text
1251 - Client does not support authentication protocol
       Fix: ALTER USER ... IDENTIFIED WITH mysql_native_password BY '...'

3889 - caching_sha2_password requires secure transport
       Fix: Use SSL, pass --get-server-public-key on the client, or switch to mysql_native_password
```

## Query and Syntax Errors

```text
1064 - You have an error in your SQL syntax
       Fix: Check query syntax; common causes: reserved word as column name

1054 - Unknown column 'x' in 'field list'
       Fix: Verify column name and table alias

1093 - You can't specify target table for update in FROM clause
       Fix: Wrap subquery in a derived table

1248 - Every derived table must have its own alias
       Fix: Add AS alias after derived table parentheses
```

## Constraint Violations

```text
1048 - Column 'x' cannot be null
       Fix: Provide a value or set a DEFAULT

1062 - Duplicate entry 'value' for key 'PRIMARY'
       Fix: Use INSERT IGNORE, ON DUPLICATE KEY UPDATE, or check data

1215 - Cannot add foreign key constraint
       Fix: Ensure referenced table/column exists and types match

1216 - Cannot add a child row: foreign key constraint fails
       Fix: Insert parent row first

1217 - Cannot delete a parent row: foreign key constraint fails
       Fix: Delete child rows first or use ON DELETE CASCADE
```

## Locking Errors

```text
1205 - Lock wait timeout exceeded; try restarting transaction
       Fix: Identify blocking transaction via SHOW ENGINE INNODB STATUS

1213 - Deadlock found when trying to get lock; try restarting transaction
       Fix: Retry the transaction; review transaction order to prevent deadlocks

3572 - Statement aborted because lock(s) could not be acquired immediately
       Fix: Retry the transaction, use SKIP LOCKED instead of NOWAIT, or remove NOWAIT to wait for the lock
```

## Table and Schema Errors

```text
1005 - Can't create table (errno: 150)
       Fix: Foreign key definition error; check column types match

1050 - Table 'x' already exists
       Fix: Use CREATE TABLE IF NOT EXISTS

1051 - Unknown table 'x'
       Fix: Check table name spelling and current database

1146 - Table 'db.x' doesn't exist
       Fix: Verify database and table names; check character case
```

## Data Errors

```text
1264 - Out of range value for column 'x'
       Fix: Check column data type range; use BIGINT for large numbers

1292 - Incorrect datetime value
       Fix: Check date format (YYYY-MM-DD HH:MM:SS); avoid '0000-00-00'

1406 - Data too long for column 'x'
       Fix: Increase column size or truncate data

1366 - Incorrect integer value: '' for column 'x'
       Fix: Use NULL instead of empty string for numeric columns
```

## Replication Errors

```text
1236 - Got fatal error reading binary log (could not find log file)
       Fix: RESET REPLICA and re-initialize with correct binlog position

1594 - Relay log read failure
       Fix: STOP REPLICA; RESET REPLICA; reconfigure and START REPLICA
```

## Looking Up Error Codes

```bash
# From the command line
perror 1205

# In MySQL 8.0+
SELECT * FROM performance_schema.error_log LIMIT 20;
```

## Summary

MySQL error codes fall into broad categories: connection/auth (1040-1130), syntax and logic (1064, 1054), constraint violations (1062, 1216), and locking (1205, 1213). Deadlock errors (1213) are always safe to retry. Lock timeouts (1205) require diagnosing blocking transactions via SHOW ENGINE INNODB STATUS. Constraint errors (1062, 1215) usually point to data integrity issues that should be fixed at the schema or application layer.
