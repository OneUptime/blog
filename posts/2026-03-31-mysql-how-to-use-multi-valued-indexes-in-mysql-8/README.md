# How to Use Multi-Valued Indexes in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Multi-Valued Index, JSON, Query Optimization

Description: Multi-valued indexes in MySQL 8.0.17+ allow indexing of JSON array elements, enabling fast lookups across arrays stored in JSON columns.

---

## Overview

A multi-valued index (MVI) is a special index type introduced in MySQL 8.0.17 that allows indexing individual elements within a JSON array. Unlike a standard index which maps a single value per row, a multi-valued index creates one index entry per element in the array, enabling fast searches across array contents.

Without MVIs, searching for a value within a JSON array requires a full table scan.

## The Problem Without Multi-Valued Indexes

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  tags JSON  -- e.g., ["electronics", "portable", "wireless"]
);

-- This requires a full table scan
SELECT * FROM products
WHERE JSON_CONTAINS(tags, '"electronics"');
```

EXPLAIN shows `type: ALL` - no index can be used.

## Creating a Multi-Valued Index

```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  tags JSON
);

-- Create a multi-valued index on the tags array (string values)
ALTER TABLE products
ADD INDEX idx_tags ((CAST(tags -> '$' AS CHAR(50) ARRAY)));
```

For an array of integers (e.g., category IDs):

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY,
  title VARCHAR(200),
  category_ids JSON
);

ALTER TABLE articles
ADD INDEX idx_categories ((CAST(category_ids -> '$' AS UNSIGNED ARRAY)));
```

## Creating a Table with a Multi-Valued Index

```sql
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT,
  product_ids JSON,
  INDEX idx_product_ids ((CAST(product_ids -> '$' AS UNSIGNED ARRAY)))
);
```

## Querying with Multi-Valued Indexes

The following functions use multi-valued indexes:

### JSON_CONTAINS

```sql
-- Find all orders containing product ID 42
SELECT id, customer_id FROM orders
WHERE JSON_CONTAINS(product_ids, '42');

-- EXPLAIN shows type: ref with idx_product_ids
EXPLAIN SELECT id FROM orders WHERE JSON_CONTAINS(product_ids, '42')\G
```

### JSON_OVERLAPS

```sql
-- Find orders that contain ANY of the specified product IDs
SELECT id FROM orders
WHERE JSON_OVERLAPS(product_ids, '[42, 57, 103]');
```

### MEMBER OF

```sql
-- Find products tagged as 'electronics'
SELECT id, name FROM products
WHERE 'electronics' MEMBER OF (tags);

-- Or with integer arrays
SELECT id FROM orders WHERE 42 MEMBER OF (product_ids);
```

## Example Dataset

```sql
INSERT INTO products (name, tags) VALUES
  ('Wireless Headphones', '["electronics", "audio", "wireless", "portable"]'),
  ('USB Hub', '["electronics", "accessories", "usb"]'),
  ('Running Shoes', '["footwear", "sports", "running"]');

-- Find all electronics products
SELECT name FROM products
WHERE 'electronics' MEMBER OF (tags);
-- Returns: Wireless Headphones, USB Hub
```

## Verifying Index Usage with EXPLAIN

```sql
EXPLAIN SELECT name FROM products
WHERE 'electronics' MEMBER OF (tags)\G
-- type: ref
-- key: idx_tags
-- rows: 2 (not the full table count)
```

## Combining Multi-Valued Index with Other Conditions

```sql
-- Combined filter: indexed array + regular column
SELECT id, name FROM products
WHERE 'electronics' MEMBER OF (tags)
AND name LIKE 'Wireless%';
```

## Limitations

- A composite index can include at most one multi-valued key part (though you can create multiple separate multi-valued indexes on the same table)
- The JSON array elements must be scalar values (not nested objects)
- Supported types: SIGNED, UNSIGNED, CHAR(n), DATE, TIME, DATETIME, DECIMAL

## Summary

Multi-valued indexes in MySQL 8.0.17+ solve the performance problem of searching within JSON arrays by creating per-element index entries. They enable functions like `JSON_CONTAINS`, `JSON_OVERLAPS`, and `MEMBER OF` to use index lookups instead of full table scans. Use them whenever your workload involves searching for specific values inside JSON array columns.
