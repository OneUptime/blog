# How to Change a Column Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, ALTER TABLE, Schema Design

Description: Learn how to change a column's data type in MySQL using ALTER TABLE MODIFY or CHANGE, with considerations for data safety and online DDL.

---

## Changing a Column Data Type with MODIFY

```sql
ALTER TABLE table_name
MODIFY COLUMN column_name new_datatype [constraints];
```

`MODIFY COLUMN` changes the data type and constraints of an existing column while keeping the same name. `COLUMN` is optional but recommended for clarity.

## Simple Data Type Change

```sql
-- Change from INT to BIGINT
ALTER TABLE orders
MODIFY COLUMN user_id BIGINT NOT NULL;

-- Change VARCHAR length
ALTER TABLE users
MODIFY COLUMN username VARCHAR(100) NOT NULL;

-- Change from VARCHAR to TEXT
ALTER TABLE articles
MODIFY COLUMN body TEXT;
```

## Using CHANGE for Rename + Type Change

`CHANGE` allows you to rename and retype in one step:

```sql
ALTER TABLE table_name
CHANGE old_column_name new_column_name new_datatype [constraints];
```

```sql
ALTER TABLE users
CHANGE user_phone phone_number VARCHAR(20) NOT NULL DEFAULT '';
```

## Checking the Current Column Definition

Before modifying, check the current definition to avoid accidental changes:

```sql
SHOW COLUMNS FROM users LIKE 'username';
```

```text
Field    | Type        | Null | Key | Default | Extra
---------+-------------+------+-----+---------+-------
username | varchar(50) | NO   | UNI | NULL    |
```

## Data Type Widening vs Narrowing

Widening (e.g., INT to BIGINT, VARCHAR(50) to VARCHAR(100)) is safe and does not risk data loss:

```sql
ALTER TABLE users
MODIFY COLUMN username VARCHAR(200) NOT NULL;
```

Narrowing (e.g., VARCHAR(200) to VARCHAR(50)) can cause data loss. In strict SQL mode (the default since MySQL 5.7), MySQL raises an error if any existing data would be truncated. In non-strict mode, data is silently truncated with a warning:

```sql
-- Check maximum length before narrowing
SELECT MAX(LENGTH(username)) FROM users;

-- Then narrow if safe
ALTER TABLE users
MODIFY COLUMN username VARCHAR(50) NOT NULL;
```

## Changing Numeric Precision

```sql
ALTER TABLE products
MODIFY COLUMN price DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
```

## Changing to an ENUM

```sql
ALTER TABLE orders
MODIFY COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    NOT NULL DEFAULT 'pending';
```

Existing values not in the ENUM list will be converted to an empty string (if the column allows it) or cause an error.

## Adding or Removing NOT NULL with MODIFY

```sql
-- Add NOT NULL constraint (set a default first for existing NULL rows)
UPDATE users SET preferences = '{}' WHERE preferences IS NULL;
ALTER TABLE users
MODIFY COLUMN preferences JSON NOT NULL;

-- Remove NOT NULL
ALTER TABLE users
MODIFY COLUMN phone VARCHAR(20) NULL;
```

## Online DDL for Data Type Changes

VARCHAR widening can be done in-place in MySQL 8.0 with InnoDB, as long as the number of length bytes stays the same (both within 0–255 or both 256+):

```sql
-- VARCHAR widening is in-place (within same length byte threshold)
ALTER TABLE users
MODIFY COLUMN username VARCHAR(200) NOT NULL,
ALGORITHM=INPLACE, LOCK=NONE;

-- Other changes like data type modifications require COPY
ALTER TABLE products
MODIFY COLUMN price DECIMAL(12, 4) NOT NULL,
ALGORITHM=COPY;
```

If the requested algorithm is not supported for a given change, MySQL returns an error. Use `ALGORITHM=INPLACE, LOCK=NONE` for supported operations like VARCHAR widening to allow concurrent DML, and `ALGORITHM=COPY` for data type changes that require a table rebuild.

## Changing to JSON Type

```sql
-- First ensure existing data is valid JSON or update it
ALTER TABLE users
MODIFY COLUMN settings JSON;
```

MySQL validates existing data during the ALTER TABLE itself - if any existing value is not valid JSON, the operation fails. After the conversion, all future inserts and updates are also validated.

## Summary

Use `ALTER TABLE ... MODIFY COLUMN` to change a column's data type in MySQL. Always check the current definition with `SHOW COLUMNS` before modifying, and verify existing data is compatible with the new type - especially when narrowing or changing to more restrictive types. In MySQL 8.0 with InnoDB, use `ALGORITHM=INPLACE, LOCK=NONE` for supported operations like VARCHAR widening to minimize disruption on production tables.
