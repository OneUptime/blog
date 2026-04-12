# How to Use DEFAULT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Function, Default, Column, Expression

Description: Learn how to use MySQL's DEFAULT() function to retrieve the default value of a table column in UPDATE and INSERT statements.

---

## Overview

MySQL's `DEFAULT(col_name)` function returns the default value defined for a column. It is especially useful in `UPDATE` statements when you want to reset a column back to its defined default, or in `INSERT` statements to reference a default value alongside other expressions.

## Basic Syntax

```sql
SELECT DEFAULT(column_name) FROM table_name LIMIT 1;
```

## Viewing a Column's Default Value

You can use `DEFAULT()` in a SELECT to inspect what a column's default is:

```sql
CREATE TABLE orders (
  id         INT          NOT NULL AUTO_INCREMENT,
  status     VARCHAR(20)  NOT NULL DEFAULT 'pending',
  priority   INT          NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

SELECT
  DEFAULT(status)     AS default_status,
  DEFAULT(priority)   AS default_priority
FROM orders
LIMIT 1;
-- Returns: pending | 1
```

Note that `SELECT DEFAULT(col) FROM table` requires at least one row in the table to return a result, since SELECT over an empty table returns no rows regardless of the expression used.

## Using DEFAULT() in UPDATE Statements

The most common use case is resetting a column to its default value in an `UPDATE` without hardcoding the value:

```sql
-- Reset status back to default for all cancelled orders older than 30 days
UPDATE orders
SET status = DEFAULT(status)
WHERE status = 'cancelled'
  AND created_at < NOW() - INTERVAL 30 DAY;
```

This is particularly useful when the default value might change over time - you don't have to update multiple places in your SQL.

## Using DEFAULT() in INSERT Statements

In an `INSERT`, `DEFAULT()` lets you mix explicit values with column defaults:

```sql
INSERT INTO orders (status, priority, created_at)
VALUES (DEFAULT(status), 5, NOW());
-- Inserts: status='pending', priority=5
```

You can also use the `DEFAULT` keyword directly (without parentheses) inside `VALUES`:

```sql
INSERT INTO orders (status, priority)
VALUES (DEFAULT, DEFAULT);
-- Inserts all defaults
```

## Combining with Conditional Logic

`DEFAULT()` is useful in CASE expressions when you want to fall back to the default:

```sql
UPDATE orders
SET priority = CASE
  WHEN customer_tier = 'gold' THEN 10
  ELSE DEFAULT(priority)
END
WHERE updated_at < NOW() - INTERVAL 7 DAY;
```

## Limitations

`DEFAULT()` only works on columns that have an explicit `DEFAULT` clause defined. Using it on a column without a default causes an error:

```sql
CREATE TABLE test_table (
  id   INT NOT NULL,
  name VARCHAR(50) NOT NULL  -- No default defined
);

SELECT DEFAULT(name) FROM test_table LIMIT 1;
-- ERROR: Field 'name' doesn't have a default value
```

Additionally, as of MySQL 8.0.13, `DEFAULT(col_name)` only works with columns that have a **literal** default value. It cannot be used with columns that have an expression default (e.g., `DEFAULT (RAND() * RAND())`). It also cannot be used with `AUTO_INCREMENT` columns or computed/generated columns, since those column types do not have literal defaults.

## Practical Pattern: Archiving with Reset

```sql
-- Archive old records and reset working columns to defaults
UPDATE tasks
SET
  assigned_to = DEFAULT(assigned_to),
  status      = DEFAULT(status),
  archived    = 1
WHERE completed_at < NOW() - INTERVAL 90 DAY;
```

## Summary

The `DEFAULT()` function retrieves a column's defined default value, making it useful for `UPDATE` statements that reset fields to their defaults and for `INSERT` statements that mix explicit and default values. It improves maintainability by removing hardcoded default values from SQL queries, deferring instead to the schema definition.
