# How to Use JSON_PRETTY() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, JSON, Database

Description: Learn how to use MySQL JSON_PRETTY() to format JSON documents with human-readable indentation for debugging, reporting, and data inspection.

---

## What JSON_PRETTY() Does

`JSON_PRETTY()` formats a JSON document with indentation and newlines, making it easy to read. It is primarily a debugging and reporting tool - the output is functionally identical to the compact form but displayed with whitespace that reveals the structure.

```mermaid
flowchart TD
    A["Compact JSON\n'{\"a\":1,\"b\":{\"c\":2,\"d\":[3,4]},\"e\":true}'"] --> B[JSON_PRETTY]
    B --> C["Pretty-printed output\n{\n  \"a\": 1,\n  \"b\": {\n    \"c\": 2,\n    \"d\": [\n      3,\n      4\n    ]\n  },\n  \"e\": true\n}"]
```

## Syntax

```sql
JSON_PRETTY(json_val)
```

- Returns a formatted string with 2-space indentation
- Returns `NULL` if the argument is `NULL`
- Available from MySQL 5.7.22+

## Basic Example

```sql
SELECT JSON_PRETTY('{"name":"Alice","roles":["admin","editor"],"active":true}') AS pretty;
```

Output:

```text
{
  "active": true,
  "name": "Alice",
  "roles": [
    "admin",
    "editor"
  ]
}
```

## Setup: Sample Table

```sql
CREATE TABLE api_responses (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    endpoint    VARCHAR(100),
    response    JSON,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO api_responses (endpoint, response) VALUES
('/users/1',
 '{"id": 1, "name": "Alice", "email": "alice@example.com", "roles": ["admin", "editor"], "settings": {"theme": "dark", "lang": "en"}}'),
('/orders/42',
 '{"order_id": 42, "status": "shipped", "items": [{"sku": "A1", "qty": 2, "price": 19.99}, {"sku": "B3", "qty": 1, "price": 49.99}], "total": 89.97}');
```

## Pretty-Printing Stored JSON

```sql
SELECT
    endpoint,
    JSON_PRETTY(response) AS formatted_response
FROM api_responses
WHERE id = 1;
```

Output for the `/users/1` row:

```text
{
  "email": "alice@example.com",
  "id": 1,
  "name": "Alice",
  "roles": [
    "admin",
    "editor"
  ],
  "settings": {
    "lang": "en",
    "theme": "dark"
  }
}
```

## Pretty-Printing a Sub-Document

```sql
-- Format only the settings object
SELECT
    endpoint,
    JSON_PRETTY(response -> '$.settings') AS settings_pretty
FROM api_responses
WHERE endpoint = '/users/1';
```

```text
{
  "lang": "en",
  "theme": "dark"
}
```

## Comparing Compact and Pretty Output

```sql
SELECT
    LENGTH(response)              AS compact_length,
    LENGTH(JSON_PRETTY(response)) AS pretty_length
FROM api_responses;
```

Pretty-printed output is always longer due to added whitespace. Never store `JSON_PRETTY()` output - always use the compact form for storage and only pretty-print for display.

## Pretty-Printing Constructed JSON

`JSON_PRETTY()` can format JSON built with other functions, useful for debugging complex expressions:

```sql
SELECT JSON_PRETTY(
    JSON_OBJECT(
        'user', JSON_OBJECT('id', 1, 'name', 'Alice'),
        'tags', JSON_ARRAY('admin', 'editor'),
        'active', TRUE
    )
) AS built_json;
```

```text
{
  "active": 1,
  "tags": [
    "admin",
    "editor"
  ],
  "user": {
    "id": 1,
    "name": "Alice"
  }
}
```

## Using JSON_PRETTY() in Debug Queries

```sql
-- Inspect the full nested order structure
SELECT
    id,
    endpoint,
    JSON_PRETTY(response) AS debug_view
FROM api_responses
WHERE endpoint LIKE '/orders/%'\G
```

The `\G` terminator in the MySQL CLI displays one column per line, making the pretty-printed JSON even easier to read in terminal output.

## NULL Handling

```sql
SELECT JSON_PRETTY(NULL);                          -- NULL
SELECT JSON_PRETTY(response -> '$.missing_key')   -- NULL (path not found)
FROM api_responses LIMIT 1;
```

## Performance Note

`JSON_PRETTY()` adds computational overhead because it parses and reformats the JSON. It should only be used in development queries, reports, and debugging sessions. Avoid it in high-volume production queries or application-facing SQL.

## Summary

`JSON_PRETTY()` formats a JSON value with 2-space indentation and newlines for human readability. It accepts any valid JSON value or column and returns `NULL` for a `NULL` argument. Use it during development to inspect nested documents, debug complex JSON expressions, and generate readable reports. Do not store the pretty-printed output and avoid it in performance-critical queries since it adds formatting overhead beyond what compact storage requires.
