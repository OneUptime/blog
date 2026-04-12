# How to Use DEFAULT Values for Columns in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Schema, Column, Default

Description: Learn how to define and use DEFAULT values for columns in MySQL, including expressions, functions, and how to manage defaults after table creation.

---

## What Are Column DEFAULT Values

A `DEFAULT` constraint tells MySQL what value to use when an `INSERT` statement omits the column. Without a default, omitting a NOT NULL column causes an error; omitting a nullable column results in `NULL`.

## Declaring Static Defaults

```sql
CREATE TABLE products (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    in_stock    TINYINT(1) NOT NULL DEFAULT 1,
    status      CHAR(1) NOT NULL DEFAULT 'A',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Insert without specifying defaulted columns:

```sql
INSERT INTO products (name, price) VALUES ('Widget Pro', 29.99);
-- in_stock = 1, status = 'A', created_at = current time
```

## Expression Defaults (MySQL 8.0.13+)

MySQL 8 allows expressions as defaults, not just literal values:

```sql
CREATE TABLE orders (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_ref    VARCHAR(20) NOT NULL DEFAULT (CONCAT('ORD-', LPAD(FLOOR(RAND() * 1000000), 6, '0'))),
    total        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at   DATETIME DEFAULT (NOW()),
    due_date     DATE DEFAULT (DATE_ADD(CURDATE(), INTERVAL 30 DAY))
);
```

## CURRENT_TIMESTAMP Default

The most common function-based default is `CURRENT_TIMESTAMP` for audit columns:

```sql
CREATE TABLE audit_entries (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    action     VARCHAR(10) NOT NULL,
    logged_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Altering Defaults After Table Creation

```sql
-- Add a default to an existing column
ALTER TABLE products MODIFY COLUMN in_stock TINYINT(1) NOT NULL DEFAULT 0;

-- Remove a default from a column
ALTER TABLE products ALTER COLUMN status DROP DEFAULT;

-- Set a new default without rebuilding the table (fast ALTER)
ALTER TABLE products ALTER COLUMN price SET DEFAULT 9.99;
```

## Viewing Column Defaults

```sql
SHOW COLUMNS FROM products;
-- The Default column shows current defaults

SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mydb' AND TABLE_NAME = 'products';
```

## DEFAULT vs NULL Handling

```sql
CREATE TABLE items (
    name     VARCHAR(100) NOT NULL,
    note     VARCHAR(255) DEFAULT NULL,  -- explicitly nullable with NULL default
    quantity INT NOT NULL DEFAULT 1      -- non-null with fallback
);

INSERT INTO items (name) VALUES ('Screw');
-- note = NULL, quantity = 1
```

## Using DEFAULT Keyword in INSERT

You can explicitly invoke the default with the `DEFAULT` keyword:

```sql
INSERT INTO products (name, price, in_stock)
VALUES ('Gadget', 49.99, DEFAULT);
-- in_stock gets the column's defined default value (1)
```

## TEXT and BLOB Column Defaults

`TEXT` and `BLOB` types cannot have a literal (non-expression) default:

```sql
-- This will cause an error (literal default)
CREATE TABLE docs (
    content TEXT DEFAULT 'placeholder'  -- ERROR
);

-- In MySQL 8.0.13+, use an expression default instead
CREATE TABLE docs (
    content TEXT DEFAULT ('placeholder')  -- OK
);
```

## Summary

Column defaults reduce the burden on application code by letting the database apply sensible fallback values. Prefer `CURRENT_TIMESTAMP` for audit timestamps, use expression defaults in MySQL 8 for computed initial values, and use `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT` for zero-copy default changes. Remember that `TEXT` and `BLOB` columns require expression syntax for non-NULL defaults in MySQL 8.0.13+.
