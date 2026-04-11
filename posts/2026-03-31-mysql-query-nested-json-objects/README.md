# How to Query Nested JSON Objects in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Query

Description: Learn how to extract and filter data from deeply nested JSON objects in MySQL using path expressions, arrow operators, and JSON functions.

---

## Nested JSON in MySQL

MySQL's JSON data type supports arbitrarily nested objects and arrays. Querying nested structures requires understanding JSON path expressions and the extraction operators `->` and `->>`.

Consider this sample table:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile JSON
);

INSERT INTO users (profile) VALUES
  ('{"name": "Alice", "address": {"city": "New York", "zip": "10001"}, "scores": {"math": 95, "english": 88}}'),
  ('{"name": "Bob", "address": {"city": "Chicago", "zip": "60601"}, "scores": {"math": 72, "english": 91}}'),
  ('{"name": "Carol", "address": {"city": "New York", "zip": "10002"}, "scores": {"math": 85, "english": 79}}');
```

## Extracting Nested Values

Use dot notation in JSON path expressions to traverse nested objects:

```sql
-- Extract a top-level field
SELECT profile->>'$.name' AS name FROM users;

-- Extract a nested field (one level deep)
SELECT profile->>'$.address.city' AS city FROM users;

-- Extract a deeply nested field
SELECT profile->>'$.scores.math' AS math_score FROM users;
```

The `->>` operator returns unquoted string values. Use `->` to keep JSON encoding.

## Filtering by Nested Values

Use extracted paths directly in `WHERE` clauses:

```sql
-- Find users in New York
SELECT id, profile->>'$.name' AS name
FROM users
WHERE profile->>'$.address.city' = 'New York';

-- Find users with math score above 80
SELECT profile->>'$.name' AS name,
       CAST(profile->>'$.scores.math' AS UNSIGNED) AS math
FROM users
WHERE CAST(profile->>'$.scores.math' AS UNSIGNED) > 80;
```

## Using JSON_EXTRACT() Explicitly

The `->` operator is shorthand for `JSON_EXTRACT()`:

```sql
SELECT JSON_EXTRACT(profile, '$.address.zip') AS zip FROM users;
-- Equivalent to: SELECT profile->'$.address.zip' FROM users;
```

## Wildcard Path Expressions

The `*` wildcard matches all keys at a level:

```sql
-- Extract all values from the scores object
SELECT JSON_EXTRACT(profile, '$.scores.*') AS all_scores FROM users;
-- Result: [88, 95] or [91, 72] etc. (keys sorted alphabetically)
```

Use `**` for recursive descent:

```sql
-- Find all "city" fields at any nesting depth
SELECT JSON_EXTRACT(profile, '$**.city') FROM users;
```

## Checking for Key Existence

```sql
-- Check if a nested key exists
SELECT id FROM users
WHERE JSON_CONTAINS_PATH(profile, 'one', '$.address.city');

-- Check multiple paths
SELECT id FROM users
WHERE JSON_CONTAINS_PATH(profile, 'all', '$.address.city', '$.scores.math');
```

## Indexing Nested JSON with Generated Columns

For frequently queried nested fields, add a generated column with an index:

```sql
ALTER TABLE users
  ADD COLUMN city VARCHAR(100) GENERATED ALWAYS AS (profile->>'$.address.city') VIRTUAL,
  ADD INDEX idx_city (city);

-- Now this query uses the index
SELECT id, city FROM users WHERE city = 'New York';
```

## Updating Nested Values

```sql
UPDATE users
SET profile = JSON_SET(profile, '$.address.zip', '10003')
WHERE id = 1;

-- Update multiple nested paths at once
UPDATE users
SET profile = JSON_SET(
  profile,
  '$.scores.math', 98,
  '$.scores.english', 92
)
WHERE id = 1;
```

## Summary

Querying nested JSON objects in MySQL uses JSON path expressions with dot notation. The `->>` operator is the most convenient way to extract scalar values from nested paths. For performance, add generated column indexes on frequently queried nested fields to avoid full-table JSON scans.
