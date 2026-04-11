# What Is STRICT_TRANS_TABLES Mode in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Mode, Data Validation, Strict Mode

Description: STRICT_TRANS_TABLES is a MySQL SQL mode that causes the server to reject invalid or missing data instead of silently adjusting it.

---

## Overview

`STRICT_TRANS_TABLES` is one of the most important SQL mode flags in MySQL. When enabled, MySQL raises an error instead of silently adjusting invalid or out-of-range data values during INSERT or UPDATE operations on transactional tables.

Without strict mode, MySQL would silently truncate strings, coerce invalid values, or insert empty strings where data is missing - leading to data corruption that can be hard to detect.

## Checking if Strict Mode Is Active

```sql
SELECT @@sql_mode LIKE '%STRICT_TRANS_TABLES%';

-- OR
SHOW VARIABLES LIKE 'sql_mode';
```

## Enabling STRICT_TRANS_TABLES

```sql
-- For the current session
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';

-- For all new connections (global)
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
```

Or in `my.cnf` / `my.ini`:

```text
[mysqld]
sql_mode = STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
```

## What STRICT_TRANS_TABLES Affects

### String Length Violations

```sql
CREATE TABLE users (name VARCHAR(5));

-- Without strict mode: silently truncated to 'Alice'
INSERT INTO users (name) VALUES ('AliceSuperLong');

-- With STRICT_TRANS_TABLES: error
-- ERROR 1406 (22001): Data too long for column 'name'
```

### NOT NULL Violations

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sku VARCHAR(20) NOT NULL
);

-- Without strict mode: empty string inserted silently
INSERT INTO products (sku) VALUES (NULL);

-- With STRICT_TRANS_TABLES: error
-- ERROR 1048 (23000): Column 'sku' cannot be null
```

### Invalid Data Types

```sql
CREATE TABLE events (event_date DATE);

-- Without strict mode: '0000-00-00' stored silently
INSERT INTO events VALUES ('not-a-date');

-- With STRICT_TRANS_TABLES: error
-- ERROR 1292 (22007): Incorrect date value
```

## STRICT_TRANS_TABLES vs STRICT_ALL_TABLES

| Mode | Transactional Tables | Non-Transactional Tables |
|------|---------------------|--------------------------|
| `STRICT_TRANS_TABLES` | Rejects invalid rows | Errors on first bad row; adjusts and warns for subsequent rows |
| `STRICT_ALL_TABLES` | Rejects invalid rows | Rejects all invalid rows |

For most modern setups using InnoDB (transactional), `STRICT_TRANS_TABLES` provides full protection.

## INSERT IGNORE Bypasses Strict Mode

If you need to intentionally allow invalid data to be silently skipped:

```sql
-- This ignores errors even in strict mode
INSERT IGNORE INTO users (name) VALUES ('TooLongName12345');
```

Use `INSERT IGNORE` carefully - it suppresses all errors including duplicates.

## Checking Warnings After Insert

```sql
INSERT INTO events VALUES ('bad-date');
SHOW WARNINGS;
-- +-------+------+----------------------------------------+
-- | Level | Code | Message                                |
-- +-------+------+----------------------------------------+
-- | Error | 1292 | Incorrect date value: 'bad-date' ...   |
```

## Impact on Application Code

When migrating to strict mode, test your application thoroughly:

```python
import mysql.connector

try:
    cursor.execute("INSERT INTO users (name) VALUES (%s)", ('VeryLongNameExceedingLimit',))
    conn.commit()
except mysql.connector.errors.DataError as e:
    print(f"Data error: {e}")
    conn.rollback()
```

## Summary

`STRICT_TRANS_TABLES` is a critical MySQL SQL mode that prevents silent data corruption by rejecting invalid data rather than coercing it. It is enabled by default in MySQL 8.0 and should be kept active in production environments. Applications should handle the resulting errors explicitly through proper validation or exception handling.
