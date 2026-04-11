# How to Use JSON_KEYS() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_KEYS() to retrieve the top-level or nested keys of a JSON object as a JSON array, useful for schema inspection and dynamic queries.

---

## What JSON_KEYS() Does

`JSON_KEYS()` returns the keys of a JSON object as a JSON array of strings. It is useful for inspecting the structure of JSON documents stored in columns, verifying that required fields exist, and building dynamic queries when the schema is not fixed.

```mermaid
flowchart TD
    A[JSON Object\n'{"a":1,"b":2,"c":{"x":10}}'] --> B[JSON_KEYS at root]
    B --> C['["a","b","c"]']
    A --> D[JSON_KEYS at path '$.c']
    D --> E['["x"]']
    F[Non-object or NULL] --> G[Returns NULL]
```

## Syntax

```sql
JSON_KEYS(json_doc [, path])
```

- `json_doc` - a JSON column or expression that evaluates to a JSON object
- `path` (optional) - a path to a nested object; if omitted, uses the root `$`

Returns a JSON array of the keys at the specified level, or `NULL` if the value at that path is not an object, or if any argument is `NULL`.

## Setup: Sample Table

```sql
CREATE TABLE configs (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    service VARCHAR(50),
    config  JSON
);

INSERT INTO configs (service, config) VALUES
('auth',
 '{"timeout": 30, "retries": 3, "tls": {"cert": "/etc/cert.pem", "key": "/etc/key.pem"}, "allowed_ips": ["10.0.0.1"]}'),
('cache',
 '{"host": "redis-1", "port": 6379, "db": 0, "password": "secret"}'),
('db',
 '{"host": "db-1", "port": 5432, "name": "appdb", "pool": {"min": 2, "max": 20}, "ssl": true}');
```

## Get Root-Level Keys

```sql
SELECT
    service,
    JSON_KEYS(config) AS top_keys
FROM configs;
```

```text
+---------+--------------------------------------------------+
| service | top_keys                                         |
+---------+--------------------------------------------------+
| auth    | ["allowed_ips", "retries", "timeout", "tls"]     |
| cache   | ["db", "host", "password", "port"]               |
| db      | ["host", "name", "pool", "port", "ssl"]          |
+---------+--------------------------------------------------+
```

## Get Keys of a Nested Object

```sql
SELECT
    service,
    JSON_KEYS(config, '$.tls')  AS tls_keys,
    JSON_KEYS(config, '$.pool') AS pool_keys
FROM configs;
```

```text
+---------+-----------------+------------------+
| service | tls_keys        | pool_keys        |
+---------+-----------------+------------------+
| auth    | ["cert", "key"] | NULL             |
| cache   | NULL            | NULL             |
| db      | NULL            | ["max", "min"]   |
+---------+-----------------+------------------+
```

## Checking Whether a Key Exists

Use `JSON_KEYS()` combined with `JSON_CONTAINS()` to test for a specific key:

```sql
-- Find services that have a 'password' key at the top level
SELECT service
FROM configs
WHERE JSON_CONTAINS(JSON_KEYS(config), '"password"');
```

An alternative using `JSON_CONTAINS_PATH()`:

```sql
SELECT service
FROM configs
WHERE JSON_CONTAINS_PATH(config, 'one', '$.password');
```

## Counting Keys

```sql
SELECT
    service,
    JSON_LENGTH(JSON_KEYS(config)) AS key_count
FROM configs
ORDER BY key_count DESC;
```

Note: `JSON_LENGTH(json_doc)` on an object also returns the number of keys, so `JSON_LENGTH(config)` is equivalent and more concise.

## Schema Validation: Ensure Required Keys Exist

```sql
-- Services missing required keys 'host' and 'port'
SELECT service
FROM configs
WHERE NOT JSON_CONTAINS(JSON_KEYS(config), '"host"')
   OR NOT JSON_CONTAINS(JSON_KEYS(config), '"port"');
```

Or with `JSON_CONTAINS_PATH`:

```sql
SELECT service
FROM configs
WHERE NOT JSON_CONTAINS_PATH(config, 'all', '$.host', '$.port');
```

## Extracting Key List as a String

Use `JSON_UNQUOTE` and string functions to work with the key list as plain text:

```sql
SELECT
    service,
    JSON_UNQUOTE(JSON_KEYS(config)) AS keys_raw
FROM configs;
-- Returns: ["timeout", "retries", "tls", "allowed_ips"]  (as a plain string)
```

## NULL Behavior

`JSON_KEYS()` returns `NULL` in several cases:

```sql
SELECT JSON_KEYS(NULL);                  -- NULL
SELECT JSON_KEYS('{"a": 1}', '$.b');    -- NULL (path does not exist)
SELECT JSON_KEYS('"just a string"');     -- NULL (not an object)
SELECT JSON_KEYS('[1, 2, 3]');           -- NULL (array, not object)
```

## Comparing Key Sets Across Rows

```sql
-- Find configs that have the same top-level keys as the 'db' config
SELECT c1.service AS service, c2.service AS matches_db_schema
FROM configs c1
JOIN configs c2 ON c2.service = 'db'
WHERE JSON_KEYS(c1.config) = JSON_KEYS(c2.config)
  AND c1.service != 'db';
```

## Summary

`JSON_KEYS()` returns a JSON array of keys for a JSON object at the root level or a specified path. It returns `NULL` when given a non-object value, a nonexistent path, or a `NULL` argument. Common uses include schema inspection, verifying required key presence, counting fields, and dynamic query construction when JSON document structure is variable. For testing whether specific paths exist, `JSON_CONTAINS_PATH()` is more direct.
