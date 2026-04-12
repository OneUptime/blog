# How to Use JSON_KEYS() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Json Keys, JSON, JSON Function, SQL

Description: Learn how to use MySQL's JSON_KEYS() function to retrieve the keys of a JSON object as a JSON array, including accessing nested object keys.

---

## Overview

`JSON_KEYS()` returns the top-level keys of a JSON object as a JSON array of strings. It is useful for schema discovery, dynamic queries, and auditing what fields exist in JSON documents stored in your database. You can also target a nested object using the optional `path` argument.

## Basic Syntax

```sql
JSON_KEYS(json_doc[, path])
```

Returns a JSON array of strings (the keys), or `NULL` if `json_doc` is `NULL`, the path does not exist, or the value at the path is not an object.

## Basic Examples

```sql
-- Get keys of a flat object
SELECT JSON_KEYS('{"name":"Alice","age":30,"city":"NYC"}');
-- Result: ["age", "city", "name"]

-- Get keys of a nested object via path
SELECT JSON_KEYS('{"user":{"name":"Alice","age":30}}', '$.user');
-- Result: ["age", "name"]

-- Returns NULL for arrays (not objects)
SELECT JSON_KEYS('[1,2,3]');
-- Result: NULL

-- Returns NULL if path doesn't exist
SELECT JSON_KEYS('{"name":"Alice"}', '$.address');
-- Result: NULL

-- NULL input
SELECT JSON_KEYS(NULL);
-- Result: NULL
```

## Schema Discovery on a JSON Column

```sql
CREATE TABLE user_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  data JSON
);

INSERT INTO user_metadata (user_id, data) VALUES
(1, '{"theme":"dark","lang":"en","beta":true}'),
(2, '{"theme":"light","font_size":14}'),
(3, '{"lang":"fr","notifications":false,"beta":true}');

-- See all keys for each row
SELECT user_id, JSON_KEYS(data) AS keys
FROM user_metadata;
```

## Checking if a Specific Key Exists

```sql
-- Check if 'beta' key is in the document
SELECT user_id
FROM user_metadata
WHERE JSON_CONTAINS_PATH(data, 'one', '$.beta');

-- Or using JSON_KEYS + JSON_CONTAINS
SELECT user_id
FROM user_metadata
WHERE JSON_CONTAINS(JSON_KEYS(data), '"beta"');
```

## Counting Keys in a JSON Object

```sql
-- Count how many keys each document has
SELECT
  user_id,
  JSON_LENGTH(JSON_KEYS(data)) AS num_keys,
  JSON_KEYS(data) AS keys
FROM user_metadata;
```

## Accessing Nested Object Keys

```sql
SET @doc = '{"profile":{"name":"Alice","age":30},"settings":{"theme":"dark"}}';

-- Top-level keys
SELECT JSON_KEYS(@doc);
-- Result: ["profile", "settings"]

-- Keys of the nested "profile" object
SELECT JSON_KEYS(@doc, '$.profile');
-- Result: ["age", "name"]

-- Keys of the nested "settings" object
SELECT JSON_KEYS(@doc, '$.settings');
-- Result: ["theme"]
```

## Practical Example: Auditing JSON Column Schema

```sql
-- Find all rows that have an unexpected 'debug' key
SELECT id, user_id
FROM user_metadata
WHERE JSON_CONTAINS(JSON_KEYS(data), '"debug"');

-- Find rows missing the required 'lang' key
SELECT id, user_id
FROM user_metadata
WHERE NOT JSON_CONTAINS(JSON_KEYS(data), '"lang"');
```

## Comparing JSON_KEYS() with JSON_EXTRACT()

```sql
-- JSON_KEYS retrieves the key names, not values
SELECT JSON_KEYS('{"a":1,"b":2}');          -- ["a", "b"]

-- JSON_EXTRACT retrieves specific values
SELECT JSON_EXTRACT('{"a":1,"b":2}', '$.a'); -- 1
```

## Using JSON_KEYS() with JSON_TABLE()

```sql
-- Expand the keys array into individual rows
SELECT jt.key_name
FROM user_metadata um,
JSON_TABLE(
  JSON_KEYS(um.data),
  '$[*]' COLUMNS (key_name VARCHAR(100) PATH '$')
) jt
WHERE um.user_id = 1;
```

## Summary

`JSON_KEYS()` returns the top-level keys of a JSON object as a JSON array, making it ideal for schema discovery, auditing, and dynamic filtering. Use the optional `path` argument to inspect keys of nested objects. Combine it with `JSON_CONTAINS()` for key existence checks, or `JSON_LENGTH()` to count keys. It returns `NULL` for arrays, non-object values, or missing paths.
