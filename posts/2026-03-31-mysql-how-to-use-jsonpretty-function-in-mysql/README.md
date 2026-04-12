# How to Use JSON_PRETTY() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Json Pretty, JSON, JSON Function, SQL

Description: Learn how to use MySQL's JSON_PRETTY() function to format JSON documents with human-readable indentation for debugging and display purposes.

---

## Overview

`JSON_PRETTY()` formats a JSON document with human-readable indentation and line breaks, making it much easier to read complex nested JSON stored in a MySQL column. It is primarily a debugging and display tool, though it can also be used to produce formatted output for application logging.

## Basic Syntax

```sql
JSON_PRETTY(json_val)
```

Returns the JSON value as a formatted string with 2-space indentation. Returns `NULL` if `json_val` is `NULL`. Produces an error if the argument is not valid JSON.

## Basic Examples

```sql
-- Format a flat object
SELECT JSON_PRETTY('{"name":"Alice","age":30,"city":"NYC"}');
```

```text
{
  "age": 30,
  "city": "NYC",
  "name": "Alice"
}
```

```sql
-- Format a nested object
SELECT JSON_PRETTY('{"user":{"name":"Alice","roles":["admin","editor"]}}');
```

```text
{
  "user": {
    "name": "Alice",
    "roles": [
      "admin",
      "editor"
    ]
  }
}
```

```sql
-- Format an array
SELECT JSON_PRETTY('[1,2,{"key":"value"},true,null]');
```

```text
[
  1,
  2,
  {
    "key": "value"
  },
  true,
  null
]
```

## Using JSON_PRETTY() with Table Columns

```sql
CREATE TABLE api_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  endpoint VARCHAR(200),
  request_body JSON,
  logged_at DATETIME DEFAULT NOW()
);

INSERT INTO api_logs (endpoint, request_body) VALUES
('/api/users', '{"name":"Alice","email":"alice@example.com","roles":["user","beta"]}');

-- Display formatted JSON for debugging
SELECT id, endpoint, JSON_PRETTY(request_body) AS pretty_body
FROM api_logs
WHERE id = 1;
```

## Comparing Compact vs Pretty Output

```sql
-- Compact (stored format)
SELECT request_body FROM api_logs WHERE id = 1;
-- {"name": "Alice", "email": "alice@example.com", "roles": ["user", "beta"]}

-- Pretty (formatted)
SELECT JSON_PRETTY(request_body) FROM api_logs WHERE id = 1;
-- {
--   "name": "Alice",
--   "email": "alice@example.com",
--   "roles": [
--     "user",
--     "beta"
--   ]
-- }
```

## Practical Example: Debugging Stored Procedures

```sql
DELIMITER $$

CREATE PROCEDURE debug_payload(p_id INT)
BEGIN
  SELECT
    id,
    endpoint,
    JSON_PRETTY(request_body) AS formatted_payload,
    logged_at
  FROM api_logs
  WHERE id = p_id;
END$$

DELIMITER ;

CALL debug_payload(1);
```

## JSON_PRETTY() in Development Workflows

```sql
-- Export formatted JSON for documentation or review
SELECT CONCAT(
  '-- Record ', id, ' (', endpoint, '):\n',
  JSON_PRETTY(request_body)
) AS debug_output
FROM api_logs
ORDER BY id;
```

## Performance Note

`JSON_PRETTY()` is not intended for high-volume production use. The formatting string is longer than the compact form and adds processing overhead. Use it in:
- Development and debugging queries
- Admin interfaces and dashboards
- Log review scripts

Do not use it in high-frequency application queries where performance matters.

## JSON_PRETTY() vs JSON_UNQUOTE()

```sql
-- JSON_PRETTY: formats the whole document with indentation
SELECT JSON_PRETTY('{"a":1}');
-- {
--   "a": 1
-- }

-- JSON_UNQUOTE: removes the outer quotes from a JSON string value
SELECT JSON_UNQUOTE('"hello"');  -- hello
```

## Summary

`JSON_PRETTY()` formats a JSON document with 2-space indentation for human readability. It is primarily a debugging and display function useful in development environments, admin dashboards, and log review. MySQL stores JSON in a compact binary format internally, so `JSON_PRETTY()` has no effect on how data is stored - it only affects the output representation.
