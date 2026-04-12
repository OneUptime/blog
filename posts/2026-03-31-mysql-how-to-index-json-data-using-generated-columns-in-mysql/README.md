# How to Index JSON Data Using Generated Columns in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Generated Column, Json Index, JSON, Performance

Description: Learn how to index JSON fields in MySQL using generated columns to enable fast lookups on JSON data stored in JSON or VARCHAR columns.

---

## Overview

MySQL cannot create a traditional index directly on a JSON column or a JSON expression. The workaround is to add a generated column that extracts the JSON value you want to index, then create a standard index on that generated column. This technique makes JSON field queries as fast as queries on regular indexed columns.

## Why Generated Column Indexes?

```sql
-- This table stores user data as JSON
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile JSON
);

-- This query does a full table scan - no index on profile->$.email
SELECT * FROM users WHERE JSON_UNQUOTE(JSON_EXTRACT(profile, '$.email')) = 'alice@example.com';
-- EXPLAIN shows: type=ALL (full scan)
```

Adding a generated column with an index solves this.

## Adding a Generated Column and Index

```sql
-- Add a virtual generated column for email
ALTER TABLE users
  ADD COLUMN profile_email VARCHAR(255)
    AS (JSON_UNQUOTE(JSON_EXTRACT(profile, '$.email'))) VIRTUAL;

-- Add an index on the generated column
ALTER TABLE users
  ADD INDEX idx_profile_email (profile_email);

-- Now the query uses the index
SELECT * FROM users WHERE profile_email = 'alice@example.com';
-- EXPLAIN shows: type=ref (index lookup)
```

## VIRTUAL vs STORED Generated Columns

```sql
-- VIRTUAL: value is computed at query time, not stored on disk
ADD COLUMN col_name TYPE AS (expression) VIRTUAL

-- STORED: value is computed and stored on disk (takes space, faster reads)
ADD COLUMN col_name TYPE AS (expression) STORED
```

For indexes, both `VIRTUAL` and `STORED` can be indexed in InnoDB. InnoDB has supported secondary indexes on virtual generated columns since MySQL 5.7.8. Other storage engines require `STORED` columns for indexing.

## Full Example: Indexing Multiple JSON Fields

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  attributes JSON
);

INSERT INTO products (attributes) VALUES
('{"sku":"A1","price":99.99,"category":"electronics","in_stock":true}'),
('{"sku":"B2","price":149.99,"category":"electronics","in_stock":false}'),
('{"sku":"C3","price":29.99,"category":"books","in_stock":true}');

-- Add generated columns for frequently queried fields
ALTER TABLE products
  ADD COLUMN attr_sku      VARCHAR(50)       AS (JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.sku')))      STORED,
  ADD COLUMN attr_category VARCHAR(100)      AS (JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.category'))) STORED,
  ADD COLUMN attr_price    DECIMAL(10,2)     AS (JSON_EXTRACT(attributes, '$.price'))                  STORED,
  ADD COLUMN attr_in_stock TINYINT(1)        AS (JSON_EXTRACT(attributes, '$.in_stock'))               STORED;

-- Create indexes on the generated columns
ALTER TABLE products
  ADD UNIQUE INDEX idx_sku (attr_sku),
  ADD INDEX idx_category (attr_category),
  ADD INDEX idx_price (attr_price),
  ADD INDEX idx_in_stock (attr_in_stock);

-- Queries now use indexes
SELECT * FROM products WHERE attr_category = 'electronics' AND attr_in_stock = 1;
SELECT * FROM products WHERE attr_price BETWEEN 50 AND 200 ORDER BY attr_price;
```

## Using the ->> Operator with Generated Columns

```sql
-- ->> is shorthand for JSON_UNQUOTE(JSON_EXTRACT())
ALTER TABLE users
  ADD COLUMN profile_country VARCHAR(100)
    AS (profile->>'$.address.country') STORED,
  ADD INDEX idx_country (profile_country);

-- Query using the shorthand operator also hits the index
SELECT * FROM users WHERE profile_country = 'US';
```

## Multi-Valued Indexes for JSON Arrays (MySQL 8.0.17+)

For indexing JSON arrays, use multi-valued indexes instead of generated columns:

```sql
CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tags JSON
);

-- Create a multi-valued index directly on the JSON array
ALTER TABLE articles
  ADD INDEX idx_tags ((CAST(tags AS CHAR(50) ARRAY)));

-- Use JSON_CONTAINS() or JSON_OVERLAPS() to trigger the index
SELECT * FROM articles WHERE JSON_CONTAINS(tags, '"mysql"');
SELECT * FROM articles WHERE JSON_OVERLAPS(tags, '["mysql","sql"]');
```

## Verifying Index Usage

```sql
-- Check that the query uses the generated column index
EXPLAIN SELECT * FROM products WHERE attr_category = 'electronics';
-- Look for: key=idx_category, type=ref

-- View generated columns
SHOW COLUMNS FROM products;
```

## Summary

To index JSON data in MySQL, add a generated column that extracts the JSON value using `JSON_EXTRACT()` or the `->>` operator, then create a standard index on that column. Use `STORED` columns if you need compatibility with non-InnoDB storage engines; `VIRTUAL` works for InnoDB secondary indexes since MySQL 5.7.8. For indexing JSON arrays, use multi-valued indexes introduced in MySQL 8.0.17 instead of generated columns.
