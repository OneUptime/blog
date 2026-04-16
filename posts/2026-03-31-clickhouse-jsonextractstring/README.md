# How to Use JSONExtractString() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, JSON, JSONExtractString, Function

Description: Learn how to extract string values from JSON documents in ClickHouse using JSONExtractString() with nested paths and practical query examples.

---

ClickHouse stores JSON as plain `String` columns in many real-world schemas. The `JSONExtractString()` function lets you pull string values out of those JSON blobs at query time without needing to pre-parse or restructure your tables.

## How JSONExtractString() Works

`JSONExtractString(json, path...)` traverses the JSON document following the provided path arguments and returns the value at that location as a `String`. If the path does not exist, or the value is not a string (e.g., it is a number or array), the function returns an empty string `''`.

Path arguments can be:
- String literals for object keys: `'key'`
- Integer literals for array indices (1-based, with negative integers counting from the end): `1`, `2`, `-1`

## Syntax

```sql
JSONExtractString(json, path_element [, path_element ...])
```

## Path Navigation

```mermaid
flowchart LR
    A["JSON String\n{\"user\":{\"name\":\"Alice\"}}"] --> B["JSONExtractString(json, 'user', 'name')"]
    B --> C["'Alice'"]
```

## Examples

### Extract a Top-Level String

```sql
SELECT JSONExtractString('{"name": "Alice", "city": "NYC"}', 'name') AS name;
```

```text
name
Alice
```

### Extract a Nested String

Provide multiple path arguments to traverse nested objects:

```sql
SELECT JSONExtractString('{"user": {"profile": {"email": "alice@example.com"}}}',
    'user', 'profile', 'email') AS email;
```

```text
email
alice@example.com
```

### Extract from an Array Element

Use an integer index to access array elements:

```sql
SELECT JSONExtractString('{"tags": ["analytics", "clickhouse", "sql"]}',
    'tags', 2) AS second_tag;
```

```text
second_tag
clickhouse
```

### Handling Missing Keys

When the key does not exist, an empty string is returned:

```sql
SELECT JSONExtractString('{"name": "Bob"}', 'email') AS missing_field;
```

```text
missing_field
(empty string)
```

### Complete Working Example

Store raw event payloads and extract fields at query time:

```sql
CREATE TABLE raw_events
(
    event_id   UInt64,
    payload    String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY event_id;

INSERT INTO raw_events (event_id, payload) VALUES
    (1, '{"user_id": "u-001", "action": "login",    "ip": "192.168.1.1"}'),
    (2, '{"user_id": "u-002", "action": "purchase", "ip": "10.0.0.5"}'),
    (3, '{"user_id": "u-001", "action": "logout",   "ip": "192.168.1.1"}');

SELECT
    event_id,
    JSONExtractString(payload, 'user_id') AS user_id,
    JSONExtractString(payload, 'action')  AS action,
    JSONExtractString(payload, 'ip')      AS ip
FROM raw_events
ORDER BY event_id;
```

```text
event_id  user_id  action    ip
1         u-001    login     192.168.1.1
2         u-002    purchase  10.0.0.5
3         u-001    logout    192.168.1.1
```

### Filtering on Extracted Values

Use `JSONExtractString()` in a WHERE clause:

```sql
SELECT event_id, JSONExtractString(payload, 'action') AS action
FROM raw_events
WHERE JSONExtractString(payload, 'user_id') = 'u-001'
ORDER BY event_id;
```

```text
event_id  action
1         login
3         logout
```

## Summary

`JSONExtractString()` is the primary function for pulling string values out of JSON documents in ClickHouse. It supports arbitrarily deep path traversal using multiple string key and integer index arguments. When a path is missing or points to a non-string value, it returns an empty string rather than an error. For large-scale production workloads, consider materializing frequently extracted fields into dedicated columns to avoid re-parsing JSON on every query.
