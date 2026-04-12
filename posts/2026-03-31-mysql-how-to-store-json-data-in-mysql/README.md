# How to Store JSON Data in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Json Data Type, Semi-Structured Data, NoSQL

Description: Learn how to store, insert, query, and update JSON data in MySQL using the native JSON data type introduced in MySQL 5.7.

---

## Overview

MySQL 5.7 introduced a native `JSON` data type that stores JSON documents in an optimized binary format. Unlike storing JSON as a `TEXT` column, the native type validates documents on insert, provides efficient path-based access, and supports indexing via generated columns.

Use the JSON type when:
- Rows have optional or variable attributes that differ per record
- You need flexibility without schema migrations for every new field
- You want to combine relational and document-style storage in one database

## Creating a Table with a JSON Column

```sql
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  price       DECIMAL(10, 2) NOT NULL,
  attributes  JSON
);
```

## Inserting JSON Data

Provide a valid JSON string literal. MySQL validates the document on insert and raises an error for malformed JSON:

```sql
-- Insert with an object
INSERT INTO products (name, price, attributes)
VALUES (
  'Wireless Keyboard',
  49.99,
  '{"color": "black", "connectivity": "bluetooth", "battery_life_hours": 120}'
);

-- Insert with nested objects and arrays
INSERT INTO products (name, price, attributes)
VALUES (
  'Gaming Headset',
  89.99,
  '{
    "color": "red",
    "connectivity": "usb",
    "features": ["surround_sound", "noise_cancelling", "mic"],
    "dimensions": {"weight_grams": 350, "cable_length_cm": 200}
  }'
);

-- Insert a NULL JSON value
INSERT INTO products (name, price, attributes)
VALUES ('Basic Mouse', 19.99, NULL);
```

## Using JSON_OBJECT() and JSON_ARRAY()

Build JSON values using MySQL's built-in constructor functions:

```sql
INSERT INTO products (name, price, attributes)
VALUES (
  'USB Hub',
  24.99,
  JSON_OBJECT(
    'color',   'silver',
    'ports',   4,
    'usb_version', '3.0',
    'features', JSON_ARRAY('fast_charge', 'data_transfer')
  )
);
```

## Reading JSON Values with ->  and ->>

MySQL provides two shorthand operators for extracting values from JSON columns:

- `->` returns the value as JSON (preserves type, strings include quotes)
- `->>` returns the value as an unquoted string

```sql
-- Extract a top-level key
SELECT
  name,
  attributes -> '$.color'   AS color_json,
  attributes ->> '$.color'  AS color_text
FROM products;

-- Extract a nested key
SELECT
  name,
  attributes ->> '$.dimensions.weight_grams' AS weight
FROM products;

-- Extract an array element (0-indexed)
SELECT
  name,
  attributes ->> '$.features[0]' AS first_feature
FROM products;
```

## Filtering Rows by JSON Values

```sql
-- Find all bluetooth products
SELECT id, name, price
FROM products
WHERE attributes ->> '$.connectivity' = 'bluetooth';

-- Find products weighing less than 400 grams
SELECT name
FROM products
WHERE (attributes ->> '$.dimensions.weight_grams') + 0 < 400;
```

## Updating JSON Columns

Replace the entire document or use `JSON_SET()` to update specific paths:

```sql
-- Replace a specific field
UPDATE products
SET attributes = JSON_SET(attributes, '$.color', 'white')
WHERE id = 1;

-- Add a new field
UPDATE products
SET attributes = JSON_SET(attributes, '$.warranty_years', 2)
WHERE id = 1;

-- Remove a field
UPDATE products
SET attributes = JSON_REMOVE(attributes, '$.battery_life_hours')
WHERE id = 1;
```

## Checking JSON Column Size

```sql
-- Check storage size of JSON documents
SELECT
  id,
  name,
  JSON_STORAGE_SIZE(attributes) AS bytes_stored
FROM products;
```

## Indexing JSON Values with Generated Columns

You cannot index a JSON column directly, but you can create a generated (virtual or stored) column from a JSON path and index that:

```sql
ALTER TABLE products
  ADD COLUMN color VARCHAR(50)
    GENERATED ALWAYS AS (attributes ->> '$.color') VIRTUAL;

CREATE INDEX idx_products_color ON products (color);

-- The query optimizer will now use this index
SELECT * FROM products WHERE color = 'black';
```

## Full Example: User Preferences Table

```sql
CREATE TABLE user_preferences (
  user_id    INT PRIMARY KEY,
  prefs      JSON NOT NULL DEFAULT (JSON_OBJECT())
);

INSERT INTO user_preferences (user_id, prefs) VALUES
  (1, '{"theme": "dark",  "language": "en", "notifications": {"email": true,  "sms": false}}'),
  (2, '{"theme": "light", "language": "fr", "notifications": {"email": false, "sms": true}}');

-- Find users with email notifications enabled
SELECT user_id
FROM user_preferences
WHERE prefs ->> '$.notifications.email' = 'true';

-- Update language preference
UPDATE user_preferences
SET prefs = JSON_SET(prefs, '$.language', 'es')
WHERE user_id = 2;
```

## Common Pitfalls

```sql
-- Comparing JSON numbers: cast to numeric type
-- Wrong - string comparison
WHERE attributes ->> '$.price' > '50'

-- Correct - numeric comparison
WHERE CAST(attributes ->> '$.price' AS DECIMAL(10,2)) > 50

-- NULL vs missing key
SELECT attributes -> '$.nonexistent';
-- Returns: NULL (same as a missing key)
-- Use JSON_CONTAINS_PATH() to distinguish
SELECT JSON_CONTAINS_PATH(attributes, 'one', '$.nonexistent');
-- Returns: 0 (path does not exist)
```

## Summary

MySQL's native JSON data type stores documents in an optimized binary format and validates them on insert. Use `->` and `->>` operators to extract values, `JSON_SET()` and `JSON_REMOVE()` to modify documents in place, and generated columns with indexes to enable fast filtering on frequently queried JSON fields. The JSON type is best suited for optional, variable, or semi-structured attributes that complement your main relational schema.
