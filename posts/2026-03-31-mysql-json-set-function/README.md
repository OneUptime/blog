# How to Use JSON_SET() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database, Function

Description: Learn how to use MySQL JSON_SET() to insert or update values within a JSON document by path, with examples covering nested keys, arrays, and UPDATE statements.

---

## What JSON_SET() Does

`JSON_SET()` updates an existing key in a JSON document or inserts the key-value pair if it does not yet exist. It is the most commonly used JSON mutation function because it handles both insert and update in one call.

```sql
SELECT JSON_SET('{"name": "Alice", "age": 28}', '$.age', 29);
-- {"name": "Alice", "age": 29}
```

The function signature is:

```sql
JSON_SET(json_doc, path, value [, path, value ...])
```

You can set multiple paths in a single call. The function returns the modified document as a new JSON value - it does not mutate in place until you use it inside an `UPDATE` statement.

## Comparison with JSON_INSERT and JSON_REPLACE

| Function | Key exists | Key absent |
|---|---|---|
| `JSON_SET()` | Updates | Inserts |
| `JSON_INSERT()` | No change | Inserts |
| `JSON_REPLACE()` | Updates | No change |

Use `JSON_SET()` when you want upsert behavior (update if present, insert if not).

## Basic Examples

```sql
SET @doc = '{"product": "Widget", "price": 9.99}';

-- Update existing key
SELECT JSON_SET(@doc, '$.price', 12.50);
-- {"product": "Widget", "price": 12.50}

-- Insert new key (does not exist yet)
SELECT JSON_SET(@doc, '$.discount', 0.10);
-- {"product": "Widget", "price": 9.99, "discount": 0.10}

-- Both at once
SELECT JSON_SET(@doc, '$.price', 12.50, '$.discount', 0.10);
-- {"product": "Widget", "price": 12.50, "discount": 0.10}
```

## Nested Keys

Use dot notation in the path to target nested objects:

```sql
SET @order = '{"id": 1, "customer": {"name": "Bob", "tier": "standard"}}';

SELECT JSON_SET(@order, '$.customer.tier', 'premium');
-- {"id": 1, "customer": {"name": "Bob", "tier": "premium"}}
```

If the intermediate path does not exist, `JSON_SET()` will create the structure only if the path resolves cleanly. Inserting into a missing nested object requires the parent to already exist:

```sql
-- Parent $.address does not exist - the path cannot resolve
SELECT JSON_SET(@order, '$.address.city', 'London');
-- Returns the document unchanged because the parent path $.address does not exist
-- Correct approach: set the whole object
SELECT JSON_SET(@order, '$.address', JSON_OBJECT('city', 'London'));
```

## Modifying Array Elements

Use the `[index]` syntax to set a specific array element:

```sql
SET @doc = '{"tags": ["sale", "new", "featured"]}';

-- Replace the second tag (index 1)
SELECT JSON_SET(@doc, '$.tags[1]', 'clearance');
-- {"tags": ["sale", "clearance", "featured"]}

-- Add an element past the end (acts as append)
SELECT JSON_SET(@doc, '$.tags[10]', 'limited');
-- {"tags": ["sale", "new", "featured", "limited"]}
```

## Using JSON_SET in UPDATE Statements

The most important use case is updating JSON columns in existing rows:

```sql
CREATE TABLE products (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  details JSON NOT NULL
);

INSERT INTO products (details) VALUES
  ('{"name": "Widget", "price": 9.99, "stock": 100}'),
  ('{"name": "Gadget", "price": 24.50, "stock": 5}');

-- Raise Widget price by 10%
UPDATE products
SET details = JSON_SET(details, '$.price', ROUND(details->>'$.price' * 1.10, 2))
WHERE details->>'$.name' = 'Widget';

-- Add a "on_sale" flag to all products
UPDATE products
SET details = JSON_SET(details, '$.on_sale', CAST('false' AS JSON));
```

## Setting Multiple Fields Atomically

Because `JSON_SET()` accepts multiple path/value pairs, you can batch multiple mutations into one expression:

```sql
UPDATE products
SET details = JSON_SET(
  details,
  '$.price',   19.99,
  '$.stock',   50,
  '$.on_sale', CAST('true' AS JSON)
)
WHERE details->>'$.name' = 'Widget';
```

This is more efficient than chaining three separate `UPDATE` calls.

## Summary

`JSON_SET(json_doc, path, value)` inserts the key-value pair if the path is absent, or replaces the existing value if the path already exists. Use it in `UPDATE` statements to mutate JSON columns in place. For insert-only behavior use `JSON_INSERT()`, and for update-only behavior use `JSON_REPLACE()`. Set multiple paths in a single call to batch mutations atomically.
