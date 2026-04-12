# How to Use ALTER TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Table, Schema, InnoDB

Description: Learn how to use ALTER TABLE in MySQL to add, modify, drop columns, change constraints, rename tables, and manage indexes with practical examples.

---

## Overview of ALTER TABLE

`ALTER TABLE` is the primary DDL command for modifying existing table structures in MySQL. It covers a wide range of operations including adding or dropping columns, changing data types, managing indexes, and renaming tables.

## Adding a Column

```sql
ALTER TABLE orders
    ADD COLUMN shipped_at DATETIME NULL AFTER updated_at;
```

Use `FIRST` or `AFTER column_name` to control column position.

## Modifying a Column's Definition

```sql
-- Change data type and constraints
ALTER TABLE products
    MODIFY COLUMN price DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
```

Use `CHANGE` when you also need to rename the column:

```sql
ALTER TABLE products
    CHANGE COLUMN unit_price price DECIMAL(12, 2) NOT NULL;
```

## Dropping a Column

```sql
ALTER TABLE orders
    DROP COLUMN legacy_flag;
```

## Adding and Dropping Indexes

```sql
-- Add an index
ALTER TABLE orders
    ADD INDEX idx_customer (customer_id);

-- Drop an index
ALTER TABLE orders
    DROP INDEX idx_customer;
```

## Adding a Foreign Key

```sql
ALTER TABLE orders
    ADD CONSTRAINT fk_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE;
```

## Renaming a Table

```sql
ALTER TABLE orders RENAME TO sales_orders;
```

Alternatively, use `RENAME TABLE`:

```sql
RENAME TABLE orders TO sales_orders;
```

## Changing the Table Engine

```sql
ALTER TABLE legacy_table ENGINE = InnoDB;
```

## Changing the Default Charset

```sql
ALTER TABLE articles
    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Combining Multiple Changes

MySQL allows multiple alterations in a single statement, which reduces the number of table rebuilds:

```sql
ALTER TABLE employees
    ADD COLUMN hire_date DATE NULL,
    ADD COLUMN title VARCHAR(100) NULL,
    MODIFY COLUMN salary DECIMAL(12, 2) NOT NULL,
    ADD INDEX idx_hire_date (hire_date);
```

## Checking the Impact Before Running

For large tables, specify the `ALGORITHM` and `LOCK` clauses to control how the change is applied. MySQL will raise an error if the requested algorithm is not supported for the operation:

```sql
ALTER TABLE large_table
    ADD COLUMN status TINYINT DEFAULT 1,
    ALGORITHM = INPLACE, LOCK = NONE;
```

`ALGORITHM=INPLACE` with `LOCK=NONE` allows online changes without blocking reads or writes when supported by InnoDB.

## Summary

`ALTER TABLE` is the central command for evolving your MySQL schema. Combine multiple operations in a single statement to minimize rebuild overhead, prefer `ALGORITHM=INPLACE` with `LOCK=NONE` for online changes on large InnoDB tables, and always test schema changes in a staging environment before applying to production.
