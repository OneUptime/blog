# How to Set a Default Value for a Column in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Schema Design, SQL

Description: Learn how to set and update default values for MySQL columns using ALTER TABLE MODIFY and ALTER TABLE ALTER COLUMN SET DEFAULT.

---

## What Is a Column Default?

A default value is used automatically when no value is provided for a column on `INSERT`. MySQL supports literal values, expressions, and special functions as defaults.

## Setting a Default at Table Creation

```sql
CREATE TABLE users (
    id         INT           NOT NULL AUTO_INCREMENT,
    username   VARCHAR(50)   NOT NULL,
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score      INT           NOT NULL DEFAULT 0,
    country    VARCHAR(50)   DEFAULT 'US',
    PRIMARY KEY (id)
);
```

## Adding a Default to an Existing Column

### Method 1: ALTER COLUMN SET DEFAULT (preferred for just changing the default)

```sql
ALTER TABLE users
ALTER COLUMN is_active SET DEFAULT TRUE;

ALTER TABLE users
ALTER COLUMN country SET DEFAULT 'US';
```

This changes only the default value without altering any other column property.

### Method 2: MODIFY COLUMN (when also changing other properties)

```sql
ALTER TABLE users
MODIFY COLUMN score INT NOT NULL DEFAULT 0;
```

`MODIFY COLUMN` requires specifying the full column definition.

## Removing a Default Value

```sql
ALTER TABLE users
ALTER COLUMN country DROP DEFAULT;
```

After this, `country` has no default and must be explicitly provided on `INSERT` (unless it allows `NULL`).

## Default CURRENT_TIMESTAMP

Timestamps can default to the current time:

```sql
ALTER TABLE events
MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

MySQL 8.0 also supports `NOW()` as a synonym and allows expression defaults:

```sql
ALTER TABLE events
MODIFY COLUMN updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP;
```

## Expression Defaults (MySQL 8.0.13+)

MySQL 8.0.13+ allows expressions as defaults, including non-deterministic functions:

```sql
ALTER TABLE orders
MODIFY COLUMN order_code VARCHAR(20) NOT NULL
    DEFAULT (CONCAT('ORD-', LPAD(FLOOR(RAND() * 100000), 5, '0')));
```

Note: Both deterministic and non-deterministic functions (like `RAND()` and `UUID()`) are supported in expression defaults. Expressions must be parenthesized.

```sql
-- UUID default
ALTER TABLE sessions
MODIFY COLUMN session_id VARCHAR(36) NOT NULL DEFAULT (UUID());
```

## Common Default Values

```sql
ALTER TABLE products
MODIFY COLUMN price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
MODIFY COLUMN stock        INT           NOT NULL DEFAULT 0,
MODIFY COLUMN is_published BOOLEAN       NOT NULL DEFAULT FALSE,
MODIFY COLUMN created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN metadata     JSON                   DEFAULT (JSON_OBJECT());
```

## Checking Current Defaults

```sql
SHOW COLUMNS FROM users;

-- Or via INFORMATION_SCHEMA
SELECT
    COLUMN_NAME,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users';
```

## Behavior on INSERT

```sql
-- This INSERT omits is_active and created_at
INSERT INTO users (username) VALUES ('Alice');

-- MySQL uses defaults:
-- is_active  = TRUE
-- created_at = current timestamp
-- score      = 0
```

## Summary

Set column defaults in MySQL using `DEFAULT value` in the column definition. To change an existing default without altering other column properties, use `ALTER TABLE ... ALTER COLUMN col SET DEFAULT value`. MySQL 8.0.13+ supports expression defaults (parenthesized). Remove a default with `ALTER COLUMN col DROP DEFAULT`. Use `CURRENT_TIMESTAMP` for automatic timestamp defaults and verify defaults with `SHOW COLUMNS` or `INFORMATION_SCHEMA.COLUMNS`.
