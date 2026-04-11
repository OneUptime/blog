# How to Use Stored Generated Columns in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Generated Column, Database, Schema, Index

Description: Learn how to use stored generated columns in MySQL to precompute and persist column values automatically based on expressions.

---

## What Are Stored Generated Columns

MySQL supports two types of generated columns: virtual and stored. A virtual generated column computes its value on the fly each time it is read, while a stored generated column computes the value once and saves it to disk. Stored columns consume more disk space but are faster to read since their values are precomputed and stored on disk. Both stored and virtual generated columns can be indexed in InnoDB, though stored columns offer broader indexing support across all storage engines.

Generated columns are defined using the `AS (expression) STORED` syntax in a `CREATE TABLE` or `ALTER TABLE` statement.

## Creating a Table with Stored Generated Columns

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  total_price DECIMAL(10, 2) AS (unit_price * quantity) STORED
);
```

When you insert a row, MySQL automatically computes and stores `total_price`:

```sql
INSERT INTO orders (unit_price, quantity) VALUES (29.99, 3);

SELECT * FROM orders;
-- total_price = 89.97
```

## Adding a Generated Column to an Existing Table

Use `ALTER TABLE` to add a stored generated column to an existing table:

```sql
ALTER TABLE products
ADD COLUMN full_name VARCHAR(255)
  AS (CONCAT(first_name, ' ', last_name)) STORED;
```

## Indexing a Stored Generated Column

While virtual generated columns can also have secondary indexes in InnoDB, stored generated columns can be indexed across all storage engines and support primary key indexing:

```sql
CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  log_date DATE AS (DATE(created_at)) STORED,
  message TEXT,
  INDEX idx_log_date (log_date)
);
```

Queries filtering on `log_date` will now use the index:

```sql
SELECT * FROM logs WHERE log_date = '2025-01-15';
```

## Practical Example - JSON Column Extraction

Stored generated columns are useful for indexing values extracted from JSON:

```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payload JSON NOT NULL,
  user_id INT AS (JSON_UNQUOTE(JSON_EXTRACT(payload, '$.user_id'))) STORED,
  INDEX idx_user_id (user_id)
);
```

Now you can efficiently query events by `user_id` even though it is stored in a JSON blob.

## Limitations to Be Aware Of

- You cannot explicitly insert or update a stored generated column.
- The expression must be deterministic and can only reference columns in the same row.
- Subqueries, stored functions, and user-defined variables are not allowed in the expression.
- Changing the base columns automatically recomputes the stored column.

```sql
-- This will fail:
INSERT INTO orders (unit_price, quantity, total_price) VALUES (10.00, 2, 20.00);
-- Error: The value specified for generated column 'total_price' is not allowed.
```

## Summary

Stored generated columns in MySQL let you persist computed values to disk, making them indexable and fast to query. They are ideal for scenarios like precomputing totals, extracting JSON fields for indexing, or normalizing date parts. Use them when you need to query or index derived values frequently.
