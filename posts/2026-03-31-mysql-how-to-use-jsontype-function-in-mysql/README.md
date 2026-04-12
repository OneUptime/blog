# How to Use JSON_TYPE() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Json Type, JSON, JSON Function, SQL

Description: Learn how to use MySQL's JSON_TYPE() function to determine the data type of a JSON value, including objects, arrays, strings, numbers, booleans, and null.

---

## Overview

`JSON_TYPE()` returns the type of a JSON value as a string such as `OBJECT`, `ARRAY`, `STRING`, `INTEGER`, `DOUBLE`, `BOOLEAN`, or `NULL`. It is essential for dynamic JSON processing where the structure of a document may vary between rows.

## Basic Syntax

```sql
JSON_TYPE(json_val)
```

Returns a `VARCHAR` type string. Returns `NULL` if `json_val` is SQL `NULL`.

## Return Values

```text
OBJECT    - JSON object {}
ARRAY     - JSON array []
STRING    - JSON string "..."
INTEGER   - JSON integer (no decimal point)
DOUBLE    - JSON floating-point number
DECIMAL   - JSON decimal number
BOOLEAN   - true or false
NULL      - JSON null keyword
DATE      - date values
TIME      - time values
DATETIME  - datetime values
TIMESTAMP - timestamp values
BIT       - bit values
BLOB      - binary string values
OPAQUE    - all other binary types
```

## Basic Examples

```sql
-- Object
SELECT JSON_TYPE('{"name":"Alice"}');    -- OBJECT

-- Array
SELECT JSON_TYPE('[1, 2, 3]');           -- ARRAY

-- String
SELECT JSON_TYPE('"hello"');             -- STRING

-- Integer
SELECT JSON_TYPE('42');                  -- INTEGER

-- Double (floating point)
SELECT JSON_TYPE('3.14');               -- DOUBLE

-- Boolean
SELECT JSON_TYPE('true');               -- BOOLEAN
SELECT JSON_TYPE('false');              -- BOOLEAN

-- JSON null
SELECT JSON_TYPE('null');               -- NULL (as a string, not SQL NULL)

-- SQL NULL input
SELECT JSON_TYPE(NULL);                 -- NULL (SQL NULL)
```

## Checking Types of Nested Values

```sql
-- Check the type of a value at a specific path
SELECT JSON_TYPE(JSON_EXTRACT('{"age":30, "tags":["sql","db"]}', '$.age'));
-- INTEGER

SELECT JSON_TYPE(JSON_EXTRACT('{"age":30, "tags":["sql","db"]}', '$.tags'));
-- ARRAY

SELECT JSON_TYPE(JSON_EXTRACT('{"age":30, "tags":["sql","db"]}', '$.name'));
-- NULL (path doesn't exist)
```

## Type-Safe JSON Processing

```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payload JSON
);

INSERT INTO events (payload) VALUES
('{"event":"click","count":5}'),
('{"event":"scroll","delta":3.7}'),
('{"event":"keypress","keys":["a","b","c"]}'),
('null');

-- Classify the type of the 'count' or 'delta' value
SELECT id,
  JSON_UNQUOTE(JSON_EXTRACT(payload, '$.event')) AS event_type,
  JSON_TYPE(JSON_EXTRACT(payload, '$.count'))    AS count_type,
  JSON_TYPE(JSON_EXTRACT(payload, '$.delta'))    AS delta_type,
  JSON_TYPE(JSON_EXTRACT(payload, '$.keys'))     AS keys_type
FROM events;
```

## Filtering by JSON Value Type

```sql
-- Find all rows where the 'value' field is a number
SELECT * FROM events
WHERE JSON_TYPE(JSON_EXTRACT(payload, '$.count')) IN ('INTEGER', 'DOUBLE');

-- Find rows where the top-level payload is an array
SELECT * FROM events
WHERE JSON_TYPE(payload) = 'ARRAY';

-- Find rows where the payload is not null
SELECT * FROM events
WHERE JSON_TYPE(payload) != 'NULL';
```

## Practical Example: Dynamic Payload Validation

```sql
DELIMITER $$

CREATE PROCEDURE process_event(p_payload JSON)
BEGIN
  IF JSON_TYPE(p_payload) != 'OBJECT' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Payload must be a JSON object';
  END IF;

  IF JSON_TYPE(JSON_EXTRACT(p_payload, '$.user_id')) NOT IN ('INTEGER', 'DOUBLE') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'user_id must be a number';
  END IF;

  INSERT INTO events (payload) VALUES (p_payload);
END$$

DELIMITER ;
```

## JSON_TYPE() with JSON_TABLE()

```sql
-- Extract types of all values in an object
SELECT jt.key_name,
  JSON_EXTRACT(d.doc, CONCAT('$.', jt.key_name)) AS val,
  JSON_TYPE(JSON_EXTRACT(d.doc, CONCAT('$.', jt.key_name))) AS value_type
FROM (SELECT CAST('{"name":"Alice","age":30,"active":true}' AS JSON) AS doc) d,
JSON_TABLE(
  JSON_KEYS(d.doc),
  '$[*]' COLUMNS (key_name VARCHAR(50) PATH '$')
) jt;
```

## Summary

`JSON_TYPE()` identifies the data type of any JSON value as a descriptive string such as `OBJECT`, `ARRAY`, `STRING`, `INTEGER`, or `DOUBLE`. Use it to build robust JSON processing logic that handles varying document structures gracefully, for input validation in stored procedures, and for filtering rows by the type of a specific JSON field.
