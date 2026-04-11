# What Is SQL Mode in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Mode, Database Configuration, Data Validation

Description: SQL Mode in MySQL controls how the server handles SQL syntax and data validation, letting you enforce strict standards or allow lenient behavior.

---

## Overview

SQL Mode is a server-level (or session-level) setting that controls how MySQL parses and validates SQL statements and data. It is a comma-separated list of mode names that tell the server which rules to enforce - from how it handles invalid dates to whether it allows division by zero.

SQL Mode affects:
- Data validation strictness (e.g., truncating vs. rejecting bad data)
- Compatibility with SQL standards (ANSI mode)
- GROUP BY behavior
- Zero-date handling

## Viewing the Current SQL Mode

```sql
-- View global SQL mode
SELECT @@GLOBAL.sql_mode;

-- View session SQL mode
SELECT @@SESSION.sql_mode;

-- Equivalent shorthand
SHOW VARIABLES LIKE 'sql_mode';
```

## Setting SQL Mode

You can set SQL mode at multiple levels:

```sql
-- Change for the current session only
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

-- Change globally (takes effect for new connections)
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
```

To persist across restarts, add it to your MySQL configuration file:

```text
[mysqld]
sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
```

## Common SQL Mode Flags

| Mode | Description |
|------|-------------|
| `STRICT_TRANS_TABLES` | Reject invalid data for transactional tables |
| `ONLY_FULL_GROUP_BY` | Require all non-aggregated columns in GROUP BY |
| `NO_ZERO_DATE` | Disallow '0000-00-00' as a valid date |
| `NO_ZERO_IN_DATE` | Disallow months or days equal to zero |
| `ERROR_FOR_DIVISION_BY_ZERO` | Reject divisions by zero |
| `NO_ENGINE_SUBSTITUTION` | Error if requested storage engine unavailable |
| `ANSI_QUOTES` | Treat double quotes as identifier quoting |
| `PIPES_AS_CONCAT` | Treat `||` as string concatenation |

## Default SQL Mode in MySQL 8

MySQL 8.0 ships with a strict default mode:

```text
ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

## Practical Example - Strict vs. Lenient Behavior

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  amount DECIMAL(10,2) NOT NULL
);

-- With STRICT_TRANS_TABLES enabled - this errors
INSERT INTO orders (amount) VALUES ('abc');
-- ERROR 1366 (HY000): Incorrect decimal value

-- Without strict mode - MySQL silently inserts 0
SET SESSION sql_mode = '';
INSERT INTO orders (amount) VALUES ('abc');
-- Query OK, 1 row affected, 1 warning (value stored as 0.00)
```

## Combining Modes

You can combine multiple modes using a comma-separated string:

```sql
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,ONLY_FULL_GROUP_BY';
```

## ANSI Compatibility Mode

MySQL provides a shorthand `ANSI` mode that combines several settings for SQL standard compatibility:

```sql
SET SESSION sql_mode = 'ANSI';

-- Now double quotes work as identifier quotes
SELECT "column_name" FROM my_table;
```

## SQL Mode in Application Connections

When connecting from application code, you can set SQL mode per-connection:

```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='app_user',
    password='secret',
    database='mydb'
)

cursor = conn.cursor()
cursor.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'")
```

## Summary

SQL Mode is a powerful MySQL feature that controls data validation strictness and SQL syntax behavior. MySQL 8 defaults to strict mode, which prevents silent data corruption from invalid inputs. Understanding and correctly configuring SQL mode is essential for maintaining data integrity and ensuring consistent application behavior across environments.
