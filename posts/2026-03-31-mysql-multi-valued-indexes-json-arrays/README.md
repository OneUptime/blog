# How to Create Multi-Valued Indexes on JSON Arrays in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Index

Description: Learn how to create multi-valued indexes on JSON array columns in MySQL 8.0 to enable fast lookups on individual array elements.

---

## What Are Multi-Valued Indexes?

A multi-valued index (introduced in MySQL 8.0.17) is a secondary index that stores multiple index entries per row - one for each element in a JSON array. This allows efficient `MEMBER OF()`, `JSON_CONTAINS()`, and `JSON_OVERLAPS()` queries on JSON array columns without full table scans.

Without a multi-valued index, filtering by array membership requires scanning every row and evaluating the JSON function. With one, MySQL can perform an index range scan.

## Creating a Multi-Valued Index

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  tags JSON
);

-- Create a multi-valued index on the tags array
ALTER TABLE products
  ADD INDEX idx_tags ((CAST(tags AS CHAR(50) ARRAY)));
```

The key syntax is `CAST(json_column AS type ARRAY)`. The `ARRAY` keyword signals to MySQL that this is a multi-valued index.

## Supported Cast Types

```sql
-- Integer array
ADD INDEX idx_scores ((CAST(scores AS UNSIGNED ARRAY)));

-- String array
ADD INDEX idx_categories ((CAST(categories AS CHAR(100) ARRAY)));

-- Date array
ADD INDEX idx_dates ((CAST(event_dates AS DATE ARRAY)));

-- Decimal array
ADD INDEX idx_prices ((CAST(prices AS DECIMAL(10,2) ARRAY)));
```

Unsupported types for multi-valued indexes include `FLOAT`, `DOUBLE`, `BLOB`, and `TEXT`.

## Creating at Table Definition Time

```sql
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200),
  tag_ids JSON,
  INDEX idx_tag_ids ((CAST(tag_ids AS UNSIGNED ARRAY)))
);
```

## Queries That Use Multi-Valued Indexes

All three JSON membership operators can leverage multi-valued indexes:

```sql
-- MEMBER OF()
EXPLAIN SELECT * FROM products WHERE 'electronics' MEMBER OF(tags)\G

-- JSON_CONTAINS()
EXPLAIN SELECT * FROM products WHERE JSON_CONTAINS(tags, '"electronics"')\G

-- JSON_OVERLAPS()
EXPLAIN SELECT * FROM products
WHERE JSON_OVERLAPS(tags, '["electronics", "audio"]')\G
```

`MEMBER OF()` queries should show `type: ref` in `EXPLAIN`, while `JSON_CONTAINS()` and `JSON_OVERLAPS()` queries show `type: range`. All three should display the index name in the `key` column.

## Verifying Index Usage

```sql
INSERT INTO products (name, tags) VALUES
  ('Laptop', '["electronics", "portable"]'),
  ('Phone', '["electronics", "mobile"]'),
  ('Pen', '["stationery"]');

EXPLAIN FORMAT=JSON
SELECT * FROM products WHERE 'electronics' MEMBER OF(tags)\G
```

Expected output includes `"index_condition": "'electronics' member of ..."` with index access.

## Limitations

Multi-valued indexes have important restrictions:

```sql
-- 1. Only one multi-valued key part is allowed per index
-- 2. Cannot be used with foreign keys
-- 3. Cannot be a primary key

-- 4. The query path must match the indexed path
-- If the index is on CAST(tags AS CHAR(50) ARRAY), this uses it:
SELECT * FROM products WHERE 'x' MEMBER OF(tags);

-- This does NOT use that index (different path expression):
SELECT * FROM products WHERE 'x' MEMBER OF(tags->'$.category');
-- To index a nested path, define the index on the same expression:
-- ADD INDEX idx_cat ((CAST(tags->'$.category' AS CHAR(50) ARRAY)));
```

## Updating JSON Arrays with an Index

Normal `JSON_SET()`, `JSON_ARRAY_APPEND()`, and full column updates all work with multi-valued indexes. The index is maintained automatically:

```sql
UPDATE products
SET tags = JSON_ARRAY_APPEND(tags, '$', 'sale')
WHERE id = 1;
```

## Summary

Multi-valued indexes on JSON arrays give MySQL the ability to index individual array elements, enabling fast membership queries with `MEMBER OF()`, `JSON_CONTAINS()`, and `JSON_OVERLAPS()`. They are a critical optimization for workloads that frequently filter rows by JSON array content.
