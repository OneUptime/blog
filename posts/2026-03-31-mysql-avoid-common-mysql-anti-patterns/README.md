# How to Avoid Common MySQL Anti-Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Anti-Pattern, Best Practice, Query, Schema

Description: Learn the most common MySQL anti-patterns including SELECT star, EAV tables, missing indexes on foreign keys, and implicit type conversions that silently hurt performance.

---

MySQL anti-patterns are design and query choices that work correctly but perform poorly or become unmaintainable at scale. Recognizing these patterns early prevents painful rewrites later.

## SELECT * in Production Queries

Fetching all columns transfers unnecessary data over the network, prevents covering index optimization, and breaks application code when columns are added or reordered:

```sql
-- Anti-pattern
SELECT * FROM orders WHERE customer_id = 42;

-- Better: select only what you need
SELECT id, status, total_amount, created_at FROM orders WHERE customer_id = 42;
```

## Entity-Attribute-Value (EAV) Tables

EAV stores arbitrary key-value pairs in a generic table instead of typed columns:

```sql
-- Anti-pattern: untyped, slow, impossible to constrain
CREATE TABLE product_attributes (
  product_id INT,
  attr_name  VARCHAR(100),
  attr_value TEXT
);

-- Better: use JSON for dynamic attributes with a typed base
CREATE TABLE products (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200),
  price      DECIMAL(10,2),
  attributes JSON
);
```

If you need to query a specific attribute, use a generated column:

```sql
ALTER TABLE products
  ADD COLUMN color VARCHAR(50)
  GENERATED ALWAYS AS (attributes->>'$.color') STORED,
  ADD INDEX idx_color (color);
```

## Missing Indexes on Foreign Keys

InnoDB automatically creates an index on foreign key columns if one does not already exist. However, relying on this implicit behavior makes schema intent unclear and the auto-created index may not match the composite or covering index you actually need:

```sql
-- Always add an index on the FK column
CREATE TABLE order_items (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  qty        INT NOT NULL,
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id),
  CONSTRAINT fk_order_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);
```

## Implicit Type Conversions

When a WHERE clause compares a string column to a numeric literal, MySQL casts every row's column value to a number, which prevents index use:

```sql
-- Anti-pattern: phone_number is VARCHAR, but the literal is numeric
SELECT * FROM users WHERE phone_number = 5551234567;

-- MySQL casts every phone_number value to a number, preventing index use
-- Better: match types exactly
SELECT * FROM users WHERE phone_number = '5551234567';
```

## Using OFFSET for Deep Pagination

`LIMIT n OFFSET m` forces MySQL to read and discard `m` rows on every page:

```sql
-- Slow for large offsets
SELECT id, name FROM products ORDER BY id LIMIT 20 OFFSET 50000;

-- Better: keyset pagination
SELECT id, name FROM products WHERE id > 50000 ORDER BY id LIMIT 20;
```

## Storing Serialized Data in Text Columns

Storing comma-separated or JSON strings in VARCHAR columns makes filtering impossible without full table scans:

```sql
-- Anti-pattern
SELECT * FROM users WHERE FIND_IN_SET('admin', roles);

-- Better: normalize to a junction table
CREATE TABLE user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role    VARCHAR(50) NOT NULL,
  PRIMARY KEY (user_id, role)
);
SELECT u.* FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

## Summary

The most damaging MySQL anti-patterns share a common theme: they sacrifice the optimizer's ability to use indexes efficiently. Avoid SELECT star, EAV tables, missing FK indexes, implicit type conversions, offset-based deep pagination, and serialized data in text columns. Catching these patterns in code review before they reach production prevents the performance cliffs that appear only when data volumes grow.
