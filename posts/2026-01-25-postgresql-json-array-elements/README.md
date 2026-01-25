# How to Access JSON Array Elements in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, JSON, JSONB, Arrays, Data Processing, NoSQL

Description: Learn how to extract, query, and manipulate JSON array elements in PostgreSQL. This guide covers array indexing, iteration, filtering, and aggregation techniques for JSON data.

---

PostgreSQL's JSON support includes powerful functions for working with arrays embedded in JSON documents. Whether you need to extract specific elements, iterate over arrays, or filter based on array contents, PostgreSQL provides the tools. This guide demonstrates practical techniques for handling JSON arrays.

## Accessing Array Elements by Index

JSON arrays in PostgreSQL use zero-based indexing.

```sql
-- Sample table with JSON array data
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    attributes JSONB
);

INSERT INTO products (name, attributes) VALUES
    ('Laptop', '{"tags": ["electronics", "portable", "computer"], "ratings": [4, 5, 4, 5, 3]}'),
    ('Desk', '{"tags": ["furniture", "office"], "ratings": [5, 5, 4]}'),
    ('Headphones', '{"tags": ["electronics", "audio", "wireless"], "ratings": [4, 4, 5, 4]}');

-- Get the first element of the tags array (index 0)
SELECT name, attributes->'tags'->0 AS first_tag
FROM products;

-- Get as text (without quotes)
SELECT name, attributes->'tags'->>0 AS first_tag
FROM products;

-- Get the second rating (index 1)
SELECT name, attributes->'ratings'->1 AS second_rating
FROM products;

-- Get the last element using negative index (PostgreSQL 12+)
SELECT name, attributes->'tags'->-1 AS last_tag
FROM products;
```

## Expanding Arrays with jsonb_array_elements

The `jsonb_array_elements` function expands a JSON array into rows.

```sql
-- Expand tags array into individual rows
SELECT
    p.name,
    tag.value AS tag
FROM products p,
LATERAL jsonb_array_elements(p.attributes->'tags') AS tag(value);

-- Result:
-- name       | tag
-- -----------+-------------
-- Laptop     | "electronics"
-- Laptop     | "portable"
-- Laptop     | "computer"
-- Desk       | "furniture"
-- ...

-- Get tags as text (without quotes)
SELECT
    p.name,
    tag AS tag_text
FROM products p,
LATERAL jsonb_array_elements_text(p.attributes->'tags') AS tag;

-- Expand with element index using WITH ORDINALITY
SELECT
    p.name,
    tag.value AS tag,
    tag.ordinality - 1 AS array_index  -- Convert to 0-based
FROM products p,
LATERAL jsonb_array_elements(p.attributes->'tags')
    WITH ORDINALITY AS tag(value, ordinality);
```

## Filtering by Array Contents

Several methods exist for checking if an array contains specific values.

```sql
-- Check if array contains a specific value using @> (contains)
SELECT name
FROM products
WHERE attributes->'tags' @> '"electronics"';

-- Check if array contains multiple values (all must be present)
SELECT name
FROM products
WHERE attributes->'tags' @> '["electronics", "portable"]';

-- Check if array contains any of several values (using ?)
SELECT name
FROM products
WHERE attributes->'tags' ? 'wireless';

-- Check if array contains any of multiple values (using ?|)
SELECT name
FROM products
WHERE attributes->'tags' ?| array['wireless', 'portable'];

-- Check if array contains all of multiple values (using ?&)
SELECT name
FROM products
WHERE attributes->'tags' ?& array['electronics', 'portable'];
```

## Aggregating Array Element Values

Perform calculations on numeric array elements.

```sql
-- Calculate average rating from the ratings array
SELECT
    name,
    (
        SELECT AVG(rating::NUMERIC)
        FROM jsonb_array_elements_text(attributes->'ratings') AS rating
    ) AS avg_rating
FROM products;

-- Sum of ratings
SELECT
    name,
    (
        SELECT SUM(rating::INTEGER)
        FROM jsonb_array_elements_text(attributes->'ratings') AS rating
    ) AS total_rating_points
FROM products;

-- Count elements in array
SELECT
    name,
    jsonb_array_length(attributes->'tags') AS tag_count,
    jsonb_array_length(attributes->'ratings') AS rating_count
FROM products;
```

## Filtering Expanded Arrays

Filter the expanded array elements using WHERE clauses.

```sql
-- Find products with ratings above 4
SELECT DISTINCT p.name
FROM products p,
LATERAL jsonb_array_elements_text(p.attributes->'ratings') AS rating
WHERE rating::INTEGER > 4;

-- Find products where all ratings are 4 or higher
SELECT p.name
FROM products p
WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p.attributes->'ratings') AS rating
    WHERE rating::INTEGER < 4
);

-- Count high ratings per product
SELECT
    p.name,
    COUNT(*) FILTER (WHERE rating::INTEGER >= 4) AS high_ratings,
    COUNT(*) AS total_ratings
FROM products p,
LATERAL jsonb_array_elements_text(p.attributes->'ratings') AS rating
GROUP BY p.name;
```

## Nested JSON Arrays

Handle arrays within nested JSON structures.

```sql
-- Table with nested arrays
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_data JSONB
);

INSERT INTO orders (order_data) VALUES
('{"customer": "Alice", "items": [
    {"product": "Laptop", "quantity": 1, "price": 999.99},
    {"product": "Mouse", "quantity": 2, "price": 29.99}
]}'),
('{"customer": "Bob", "items": [
    {"product": "Keyboard", "quantity": 1, "price": 79.99},
    {"product": "Monitor", "quantity": 1, "price": 299.99},
    {"product": "Webcam", "quantity": 1, "price": 49.99}
]}');

-- Extract items from nested array
SELECT
    o.order_data->>'customer' AS customer,
    item->>'product' AS product,
    (item->>'quantity')::INTEGER AS quantity,
    (item->>'price')::DECIMAL AS price
FROM orders o,
LATERAL jsonb_array_elements(o.order_data->'items') AS item;

-- Calculate order totals
SELECT
    o.order_data->>'customer' AS customer,
    SUM((item->>'quantity')::INTEGER * (item->>'price')::DECIMAL) AS order_total
FROM orders o,
LATERAL jsonb_array_elements(o.order_data->'items') AS item
GROUP BY o.id, o.order_data->>'customer';
```

## Modifying JSON Arrays

PostgreSQL provides functions to modify array contents.

```sql
-- Append element to array
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{tags}',
    attributes->'tags' || '"new-tag"'::JSONB
)
WHERE name = 'Laptop';

-- Prepend element to array
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{tags}',
    '"first-tag"'::JSONB || (attributes->'tags')
)
WHERE name = 'Laptop';

-- Remove element by value
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{tags}',
    (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(attributes->'tags') AS elem
        WHERE elem != '"portable"'
    )
)
WHERE name = 'Laptop';

-- Remove element by index (remove second element)
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{tags}',
    (attributes->'tags') - 1  -- Remove index 1
)
WHERE name = 'Laptop';

-- Insert element at specific position
CREATE OR REPLACE FUNCTION jsonb_array_insert(
    arr JSONB,
    pos INTEGER,
    new_element JSONB
) RETURNS JSONB AS $$
SELECT jsonb_agg(elem ORDER BY idx)
FROM (
    SELECT elem, idx
    FROM jsonb_array_elements(arr) WITH ORDINALITY AS t(elem, idx)
    WHERE idx <= pos
    UNION ALL
    SELECT new_element, pos + 0.5
    UNION ALL
    SELECT elem, idx
    FROM jsonb_array_elements(arr) WITH ORDINALITY AS t(elem, idx)
    WHERE idx > pos
) sub;
$$ LANGUAGE SQL;
```

## Searching Within Array Elements

Search for partial matches within array elements.

```sql
-- Find products with tags containing 'elec'
SELECT name
FROM products
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(attributes->'tags') AS tag
    WHERE tag LIKE '%elec%'
);

-- Case-insensitive search
SELECT name
FROM products
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(attributes->'tags') AS tag
    WHERE tag ILIKE '%port%'
);

-- Using regular expressions
SELECT name
FROM products
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(attributes->'tags') AS tag
    WHERE tag ~ '^[aeiou]'  -- Tags starting with vowel
);
```

## Indexing JSON Arrays

Create indexes to speed up JSON array queries.

```sql
-- GIN index for containment queries
CREATE INDEX idx_products_tags ON products USING GIN ((attributes->'tags'));

-- This index supports @>, ?, ?|, ?& operators
EXPLAIN SELECT name FROM products WHERE attributes->'tags' @> '"electronics"';

-- GIN index for the entire JSONB column
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Expression index for specific array access
CREATE INDEX idx_products_first_tag ON products ((attributes->'tags'->0));
```

## Converting Arrays Between Formats

Transform JSON arrays to PostgreSQL arrays and back.

```sql
-- Convert JSON array to PostgreSQL array
SELECT
    name,
    ARRAY(
        SELECT jsonb_array_elements_text(attributes->'tags')
    ) AS tags_array
FROM products;

-- Convert PostgreSQL array to JSON array
SELECT jsonb_agg(elem) AS json_array
FROM unnest(ARRAY['a', 'b', 'c']) AS elem;

-- Convert JSON number array to PostgreSQL integer array
SELECT
    name,
    ARRAY(
        SELECT (elem)::INTEGER
        FROM jsonb_array_elements_text(attributes->'ratings') AS elem
    ) AS ratings_array
FROM products;
```

## Working with Empty and Null Arrays

Handle edge cases with empty arrays and null values.

```sql
-- Check for empty array
SELECT name
FROM products
WHERE jsonb_array_length(COALESCE(attributes->'tags', '[]'::JSONB)) = 0;

-- Provide default for missing arrays
SELECT
    name,
    COALESCE(jsonb_array_length(attributes->'tags'), 0) AS tag_count
FROM products;

-- Safe expansion of potentially null arrays
SELECT
    p.name,
    COALESCE(tag, 'no tags') AS tag
FROM products p
LEFT JOIN LATERAL jsonb_array_elements_text(
    COALESCE(p.attributes->'tags', '[]'::JSONB)
) AS tag ON true;
```

JSON array operations in PostgreSQL enable flexible document-style data modeling while maintaining the query power of a relational database. Use these techniques to efficiently store, query, and transform semi-structured data within your PostgreSQL applications.
