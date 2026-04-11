# What Is a CHECK Constraint in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Constraint, Data Integrity, DDL, MySQL 8

Description: A CHECK constraint in MySQL 8 enforces a boolean condition on column values, rejecting any row that does not satisfy the specified expression at insert or update time.

---

## Overview

Prior to MySQL 8.0.16, CHECK constraints were parsed but silently ignored. Starting with MySQL 8.0.16, CHECK constraints are fully enforced, allowing you to declare data validation rules directly in the schema rather than relying solely on application code.

## Basic Syntax

```sql
-- Column-level CHECK constraint
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    price DECIMAL(10, 2) CHECK (price > 0),
    stock INT CHECK (stock >= 0),
    name VARCHAR(255) NOT NULL
);

-- Table-level CHECK constraint with an explicit name
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quantity INT NOT NULL,
    discount DECIMAL(5, 2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_discount_range CHECK (discount >= 0 AND discount <= 100)
);
```

## Enforcing Data Integrity

When a CHECK constraint is violated, MySQL raises an error and rejects the row:

```sql
-- This will fail: price must be positive
INSERT INTO products (price, stock, name)
VALUES (-10.00, 5, 'Widget');
-- ERROR 3819 (HY000): Check constraint 'products_chk_1' is violated.

-- This will succeed
INSERT INTO products (price, stock, name)
VALUES (19.99, 100, 'Widget');
```

## Multi-Column CHECK Constraints

CHECK constraints can reference multiple columns in the same table:

```sql
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    CONSTRAINT chk_date_order CHECK (end_date >= start_date)
);

-- This will fail
INSERT INTO events (start_date, end_date, title)
VALUES ('2026-04-10', '2026-04-05', 'Conference');
-- ERROR 3819: Check constraint 'chk_date_order' is violated.
```

## Adding CHECK Constraints to Existing Tables

```sql
ALTER TABLE products
    ADD CONSTRAINT chk_name_length CHECK (CHAR_LENGTH(name) >= 2);

-- Or without a name (MySQL auto-generates one)
ALTER TABLE products
    ADD CHECK (price < 1000000);
```

## Viewing CHECK Constraints

```sql
-- View constraints for a specific table
SELECT
    cc.CONSTRAINT_NAME,
    cc.CHECK_CLAUSE,
    tc.ENFORCED
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
    AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
WHERE tc.TABLE_SCHEMA = 'mydb'
  AND tc.TABLE_NAME = 'products'
  AND tc.CONSTRAINT_TYPE = 'CHECK';
```

```text
+-------------------+-----------------------------+----------+
| CONSTRAINT_NAME   | CHECK_CLAUSE                | ENFORCED |
+-------------------+-----------------------------+----------+
| chk_price_positive| (`price` > 0)               | YES      |
| chk_stock_nonneg  | (`stock` >= 0)              | YES      |
+-------------------+-----------------------------+----------+
```

You can also use `SHOW CREATE TABLE`:

```sql
SHOW CREATE TABLE products\G
```

## Disabling a CHECK Constraint

MySQL 8 allows CHECK constraints to exist but be NOT ENFORCED. This is useful during bulk data migrations:

```sql
-- Create a non-enforced constraint
ALTER TABLE products
    ADD CONSTRAINT chk_price_max CHECK (price <= 9999.99) NOT ENFORCED;

-- Re-enable enforcement later
ALTER TABLE products
    ALTER CONSTRAINT chk_price_max ENFORCED;
```

## Dropping a CHECK Constraint

```sql
ALTER TABLE products
    DROP CHECK chk_price_positive;
```

## What Expressions Are Allowed

CHECK constraints must be deterministic and self-contained:

```sql
-- Allowed: scalar expressions, string functions, arithmetic
CONSTRAINT chk_email CHECK (email LIKE '%@%.%')
CONSTRAINT chk_age CHECK (age BETWEEN 0 AND 150)
CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'pending'))

-- NOT allowed: subqueries, stored functions, or references to other tables
-- CONSTRAINT chk_user CHECK (user_id IN (SELECT id FROM users)) -- INVALID
```

## Practical Example: E-Commerce Inventory Table

```sql
CREATE TABLE inventory (
    sku VARCHAR(50) PRIMARY KEY,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 0,
    reorder_quantity INT NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT chk_qty_nonneg CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_reorder_nonneg CHECK (reorder_point >= 0),
    CONSTRAINT chk_reorder_qty_pos CHECK (reorder_quantity > 0),
    CONSTRAINT chk_cost_positive CHECK (unit_cost > 0),
    CONSTRAINT chk_margin CHECK (unit_price > unit_cost)
);
```

## Summary

CHECK constraints in MySQL 8 provide a native, database-enforced mechanism for data validation, filling a long-standing gap in MySQL's constraint support. They allow you to define rules like value ranges, string patterns, and cross-column conditions directly in your schema. Using CHECK constraints alongside NOT NULL and FOREIGN KEY constraints gives you a robust first line of defense against invalid data.
