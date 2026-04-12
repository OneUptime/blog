# How to Use Functional Indexes in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Functional Index, Index, Query Optimization

Description: Functional indexes in MySQL 8.0.13+ allow indexing the result of an expression or function call, enabling fast queries on computed values like YEAR(date_column).

---

## Overview

Functional indexes (also called expression indexes) were introduced in MySQL 8.0.13. They allow you to index the result of an expression - such as a function applied to a column - rather than a raw column value. This solves a common performance problem where queries use functions in WHERE clauses, which normally prevents index usage.

Functionally, MySQL implements functional indexes as hidden generated columns with an index on the generated column.

## The Problem Without Functional Indexes

```sql
CREATE TABLE events (
  id INT PRIMARY KEY,
  event_name VARCHAR(100),
  created_at DATETIME,
  INDEX idx_created_at (created_at)
);

-- This query CANNOT use the index because of YEAR()
SELECT * FROM events WHERE YEAR(created_at) = 2026;
-- EXPLAIN shows type: ALL (full table scan)
```

## Creating a Functional Index

```sql
-- Index the YEAR() function on created_at
CREATE INDEX idx_year_created
ON events ((YEAR(created_at)));

-- Now this query uses the index
SELECT * FROM events WHERE YEAR(created_at) = 2026;
```

## Verifying Index Usage

```sql
EXPLAIN SELECT * FROM events WHERE YEAR(created_at) = 2026\G
-- key: idx_year_created
-- type: ref
```

## Common Use Cases

### Case-Insensitive Search

```sql
-- Index lowercase version for case-insensitive lookups
ALTER TABLE users
ADD INDEX idx_lower_email ((LOWER(email)));

-- Query now uses the index
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';
```

### JSON Path Indexing

```sql
CREATE TABLE products (
  id INT PRIMARY KEY,
  data JSON
);

-- Index a specific JSON field
ALTER TABLE products
ADD INDEX idx_sku ((CAST(data->>'$.sku' AS CHAR(50))));

-- Query uses the index
SELECT * FROM products WHERE CAST(data->>'$.sku' AS CHAR(50)) = 'SKU-123';
```

### Date Part Extraction

```sql
CREATE TABLE sales (
  id INT PRIMARY KEY,
  sale_date DATE,
  amount DECIMAL(10,2)
);

-- Index the month for month-based reporting
ALTER TABLE sales
ADD INDEX idx_month ((MONTH(sale_date)));

-- Fast monthly lookups
SELECT SUM(amount) FROM sales WHERE MONTH(sale_date) = 3;
```

### Computed Length Index

```sql
-- Index the length of a column (useful for range queries on length)
ALTER TABLE documents
ADD INDEX idx_content_length ((LENGTH(content)));

SELECT id FROM documents WHERE LENGTH(content) > 1000;
```

## Creating Functional Indexes at Table Creation

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_email VARCHAR(255),
  created_at DATETIME,
  INDEX idx_lower_email ((LOWER(customer_email))),
  INDEX idx_create_year ((YEAR(created_at)))
);
```

## Composite Functional Index

```sql
-- Combine regular column and expression in one index
ALTER TABLE events
ADD INDEX idx_year_name ((YEAR(created_at)), event_name);

SELECT * FROM events
WHERE YEAR(created_at) = 2026 AND event_name = 'click';
```

## Limitations

- The expression must be enclosed in double parentheses `((...))` in the CREATE INDEX syntax
- Non-deterministic functions (e.g., `NOW()`, `RAND()`) cannot be indexed
- Subqueries cannot be used in functional indexes
- The expression must reference columns from the same table

## Comparing Functional Index vs Generated Column

Both approaches achieve similar results:

```sql
-- Generated column approach
ALTER TABLE users ADD COLUMN email_lower VARCHAR(255)
  AS (LOWER(email)) VIRTUAL;
ALTER TABLE users ADD INDEX idx_email_lower (email_lower);

-- Functional index approach (MySQL 8.0.13+)
ALTER TABLE users ADD INDEX idx_email_lower ((LOWER(email)));
```

The functional index approach is simpler as it does not add a visible column.

## Summary

Functional indexes in MySQL 8.0.13+ allow indexing expressions and function results, solving the classic problem of functions in WHERE clauses preventing index usage. They are particularly useful for case-insensitive lookups, JSON field queries, and date part filtering. Always verify index usage with EXPLAIN after adding a functional index to confirm the optimizer chooses it.
