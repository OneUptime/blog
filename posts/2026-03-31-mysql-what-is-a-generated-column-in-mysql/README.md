# What Is a Generated Column in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Generated Column, Virtual Column, Schema Design, InnoDB

Description: A generated column in MySQL is a column whose value is automatically computed from an expression based on other columns, either stored on disk or computed on the fly.

---

## Overview

Generated columns (also called computed or virtual columns) allow you to define a column whose value is derived from an expression involving other columns in the same row. Introduced in MySQL 5.7, they eliminate the need to maintain derived data in application code and enable indexing computed values.

## Two Types of Generated Columns

MySQL supports two modes for generated columns:

| Type | Storage | When Computed | Disk Usage |
|------|---------|---------------|------------|
| VIRTUAL | Not stored | On every read | No extra space |
| STORED | Stored on disk | On write (INSERT/UPDATE) | Extra space required |

The default is VIRTUAL when you omit the keyword.

## Basic Syntax

```sql
CREATE TABLE rectangles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    width DECIMAL(10, 2) NOT NULL,
    height DECIMAL(10, 2) NOT NULL,
    -- Virtual: computed on SELECT, not stored
    area DECIMAL(10, 2) GENERATED ALWAYS AS (width * height) VIRTUAL,
    -- Stored: computed on INSERT/UPDATE, persisted to disk
    perimeter DECIMAL(10, 2) GENERATED ALWAYS AS (2 * (width + height)) STORED
);
```

## Inserting Data

You cannot explicitly insert into a generated column - MySQL handles it automatically:

```sql
-- Only specify the base columns
INSERT INTO rectangles (width, height) VALUES (5.0, 3.0);

-- Attempting to insert a value into a generated column raises an error
-- INSERT INTO rectangles (width, height, area) VALUES (5.0, 3.0, 15.0);
-- ERROR 3105: The value specified for generated column 'area' is not allowed.

SELECT * FROM rectangles;
```

```text
+----+-------+--------+------+-----------+
| id | width | height | area | perimeter |
+----+-------+--------+------+-----------+
|  1 |  5.00 |   3.00 | 15.00|     16.00 |
+----+-------+--------+------+-----------+
```

## Practical Example: Full-Name Column

```sql
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(201) GENERATED ALWAYS AS (
        CONCAT(first_name, ' ', last_name)
    ) VIRTUAL,
    email VARCHAR(255),
    salary DECIMAL(10, 2)
);

INSERT INTO employees (first_name, last_name, email, salary)
VALUES ('Jane', 'Smith', 'jane@example.com', 85000.00);

SELECT full_name, email FROM employees;
```

```text
+------------+------------------+
| full_name  | email            |
+------------+------------------+
| Jane Smith | jane@example.com |
+------------+------------------+
```

## Indexing Generated Columns

One of the most powerful uses of generated columns is enabling indexes on expressions. This is especially useful with JSON data:

```sql
CREATE TABLE events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payload JSON NOT NULL,
    -- Extract a JSON field into a virtual column
    event_type VARCHAR(50) GENERATED ALWAYS AS (
        JSON_UNQUOTE(JSON_EXTRACT(payload, '$.type'))
    ) VIRTUAL,
    -- Index the virtual column for fast lookups
    INDEX idx_event_type (event_type)
);

INSERT INTO events (payload)
VALUES ('{"type": "login", "user_id": 42, "ip": "192.168.1.1"}'),
       ('{"type": "purchase", "user_id": 15, "amount": 99.99}');

-- This query uses the index on the virtual column
SELECT * FROM events WHERE event_type = 'login';
```

## Adding a Generated Column to an Existing Table

```sql
ALTER TABLE employees
    ADD COLUMN salary_band VARCHAR(20)
    GENERATED ALWAYS AS (
        CASE
            WHEN salary < 50000 THEN 'Junior'
            WHEN salary < 100000 THEN 'Mid'
            ELSE 'Senior'
        END
    ) VIRTUAL;
```

## Allowed Expressions

Generated columns support a wide range of deterministic expressions:

```sql
-- String operations
full_name VARCHAR(255) GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) VIRTUAL,

-- Conditional logic
is_discounted TINYINT GENERATED ALWAYS AS (IF(price < original_price, 1, 0)) VIRTUAL,

-- Mathematical operations
bmi DECIMAL(5,2) GENERATED ALWAYS AS (weight / (height * height)) STORED,

-- JSON extraction
city VARCHAR(100) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(address_json, '$.city'))) VIRTUAL
```

## Limitations

- Generated columns can only reference other generated columns defined earlier in the table (no forward references)
- VIRTUAL columns cannot be part of a foreign key
- Expressions must be deterministic (no `NOW()`, `RAND()`, subqueries)
- STORED generated columns support all index types; VIRTUAL columns support secondary indexes only

```sql
-- Check generated column definitions
SELECT
    COLUMN_NAME,
    GENERATION_EXPRESSION,
    EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mydb'
  AND TABLE_NAME = 'employees'
  AND EXTRA LIKE '%GENERATED%';
```

## Summary

Generated columns in MySQL allow you to derive computed values from other columns and define them directly in the schema. VIRTUAL columns are computed at read time with no storage overhead, while STORED columns persist computed values for faster reads at the cost of extra disk space. By indexing virtual columns, you can dramatically speed up queries on expressions and JSON fields without duplicating data.
