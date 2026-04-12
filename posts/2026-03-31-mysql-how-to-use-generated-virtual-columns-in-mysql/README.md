# How to Use Generated (Virtual) Columns in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Generated Column, Virtual Column, Database Design, Performance

Description: Learn how to use generated columns in MySQL to automatically compute column values from expressions, reducing application logic and enabling indexing on computed values.

---

## What Are Generated Columns?

Generated columns (also called computed columns) are columns whose values are automatically calculated from an expression involving other columns. MySQL supports two types:

- **VIRTUAL** - computed on-the-fly during reads, not stored on disk (default)
- **STORED** - computed and stored on disk when the row is inserted or updated

```sql
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.08,
    tax_amount DECIMAL(10, 2) GENERATED ALWAYS AS (price * tax_rate) VIRTUAL,
    total_price DECIMAL(10, 2) GENERATED ALWAYS AS (price + price * tax_rate) STORED
);
```

## VIRTUAL vs STORED

```sql
-- VIRTUAL: no disk space used, computed at query time
-- Good for: infrequently queried, simple expressions
ALTER TABLE products
ADD COLUMN price_category VARCHAR(10)
    GENERATED ALWAYS AS (
        CASE
            WHEN price < 10 THEN 'cheap'
            WHEN price < 100 THEN 'medium'
            ELSE 'expensive'
        END
    ) VIRTUAL;

-- STORED: takes disk space, faster reads, can be indexed
-- Good for: frequently queried, complex expressions
ALTER TABLE products
ADD COLUMN search_name VARCHAR(400)
    GENERATED ALWAYS AS (LOWER(CONCAT(name, ' ', description))) STORED;
```

## Inserting and Updating Rows

You cannot set generated column values directly - MySQL computes them automatically:

```sql
-- Generated columns are excluded from INSERT
INSERT INTO products (price, tax_rate)
VALUES (49.99, 0.08);

-- MySQL computes: tax_amount = 4.00, total_price = 53.99 (rounded to DECIMAL(10,2))

-- Verify the computed values
SELECT id, price, tax_rate, tax_amount, total_price FROM products WHERE id = 1;

-- Trying to insert into a generated column raises an error
-- INSERT INTO products (price, tax_amount) VALUES (49.99, 3.99);
-- ERROR: The value specified for generated column 'tax_amount' is not allowed
```

## Common Use Cases

### Extracting Parts of JSON

```sql
CREATE TABLE user_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payload JSON NOT NULL,
    user_id INT GENERATED ALWAYS AS (payload->>'$.user_id') STORED,
    event_type VARCHAR(50) GENERATED ALWAYS AS (payload->>'$.event') STORED,
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type)
);

INSERT INTO user_events (payload)
VALUES ('{"user_id": 42, "event": "login", "ip": "192.168.1.1"}');

SELECT user_id, event_type FROM user_events WHERE user_id = 42;
```

### Full Name Concatenation

```sql
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(201) GENERATED ALWAYS AS (
        CONCAT(first_name, ' ', last_name)
    ) VIRTUAL
);
```

### Date Part Extraction

```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_date DATETIME NOT NULL,
    order_year SMALLINT GENERATED ALWAYS AS (YEAR(order_date)) STORED,
    order_month TINYINT GENERATED ALWAYS AS (MONTH(order_date)) STORED,
    INDEX idx_year_month (order_year, order_month)
);
```

## Indexing Generated Columns

Both `STORED` and `VIRTUAL` generated columns can be indexed in InnoDB (MySQL 5.7.5+). However, STORED columns are preferred when the expression is expensive to compute, since the value is persisted on disk and does not need to be recalculated on every index lookup:

```sql
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    salary DECIMAL(10, 2),
    department VARCHAR(50),
    -- Stored generated column for index
    name_lower VARCHAR(201)
        GENERATED ALWAYS AS (LOWER(CONCAT(first_name, ' ', last_name))) STORED,
    INDEX idx_name_lower (name_lower)
);

-- This query now uses the index
SELECT * FROM employees WHERE name_lower = 'alice johnson';
```

## Limitations

```sql
-- Generated columns can reference other generated columns defined earlier in the table
-- Generated columns cannot call non-deterministic functions like NOW(), RAND(), UUID()
-- Subqueries are not allowed in generated column expressions

-- Valid expression examples:
-- CONCAT(), LENGTH(), UPPER(), LOWER(), YEAR(), MONTH(), DAY()
-- Arithmetic: price * quantity
-- Conditional: IF(), CASE WHEN
-- JSON: JSON_EXTRACT(), ->

-- Invalid:
-- NOW(), RAND(), UUID(), SLEEP()
-- Subqueries
-- Stored procedures or user-defined functions (in most cases)
```

## Summary

Generated columns in MySQL eliminate redundant computations by deriving values automatically from expressions. Use VIRTUAL columns for occasional reads to save disk space, and STORED columns when you need to index the computed value or query it frequently. They are especially powerful for extracting and indexing data from JSON columns, computing full-text search keys, and partitioning by date components.
