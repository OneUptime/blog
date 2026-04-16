# How to Store and Query JSON Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, JSON, Data Type, JSONExtract

Description: Learn how to store and query JSON data in ClickHouse using String columns, JSONExtract functions, and the new JSON data type.

---

JSON is one of the most common data formats for logs, events, and API payloads. ClickHouse offers multiple strategies for handling JSON: storing it as a raw `String` and extracting fields at query time, using the semi-structured `Object('json')` type, or using the new first-class `JSON` type introduced in recent versions. Each approach has different tradeoffs between schema flexibility, query performance, and storage efficiency.

## Storing JSON as String

The simplest approach is to store raw JSON in a `String` column and parse it at query time using `JSONExtract*` functions. This requires no schema definition for the JSON structure and works well for exploratory queries or unpredictable payloads.

```sql
CREATE TABLE raw_events (
    id         UInt64,
    payload    String,
    created_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (id, created_at);

INSERT INTO raw_events (id, payload) VALUES
(1, '{"user_id": 42, "action": "login", "score": 9.8}'),
(2, '{"user_id": 99, "action": "purchase", "amount": 150.0}'),
(3, '{"user_id": 42, "action": "logout"}');
```

## Querying with JSONExtract Functions

ClickHouse provides type-specific extraction functions for JSON stored as strings:

```sql
-- Extract a string field
SELECT
    id,
    JSONExtractString(payload, 'action') AS action
FROM raw_events;

-- Extract an integer field
SELECT
    id,
    JSONExtractInt(payload, 'user_id') AS user_id
FROM raw_events;

-- Extract a float field
SELECT
    id,
    JSONExtractFloat(payload, 'score') AS score
FROM raw_events
WHERE JSONExtractString(payload, 'action') = 'login';

-- Extract a field with a fallback for missing keys
SELECT
    id,
    JSONExtractFloat(payload, 'amount')  AS amount,
    JSONExtractString(payload, 'action') AS action
FROM raw_events;
-- Rows without 'amount' return 0.0
```

For nested JSON, use the path-style syntax with dot notation expressed as multiple arguments:

```sql
INSERT INTO raw_events (id, payload)
VALUES (4, '{"user": {"id": 7, "name": "Alice"}, "event": "signup"}');

SELECT
    JSONExtractString(payload, 'user', 'name')  AS user_name,
    JSONExtractInt(payload, 'user', 'id')       AS user_id
FROM raw_events
WHERE id = 4;
```

## Using simpleJSON Functions

For flat JSON with no nesting and simple string values, `simpleJSON*` functions are faster because they use a hand-rolled parser instead of a full JSON parser:

```sql
SELECT
    simpleJSONExtractString(payload, 'action')   AS action,
    simpleJSONExtractUInt(payload, 'user_id')    AS user_id
FROM raw_events
WHERE simpleJSONHas(payload, 'user_id');
```

Use `simpleJSON*` only when the JSON is well-formed, flat, and you need maximum extraction throughput.

## Using JSONExtractRaw and JSONExtractKeys

To extract a nested object or array as a string for further processing:

```sql
SELECT
    JSONExtractRaw(payload, 'user')  AS user_object
FROM raw_events
WHERE id = 4;
-- Result: {"id":7,"name":"Alice"}

SELECT
    JSONExtractKeys(payload)  AS keys
FROM raw_events
WHERE id = 1;
-- Result: ['user_id','action','score']
```

## Using the Object('json') Type (Semi-Structured)

The `Object('json')` type stores JSON as a semi-structured column and exposes subfields as typed subcolumns. It was the predecessor to the new `JSON` type and is available in ClickHouse 22.3+.

```sql
CREATE TABLE semi_structured_events (
    id      UInt64,
    data    Object('json')
) ENGINE = MergeTree()
ORDER BY id;

INSERT INTO semi_structured_events FORMAT JSONEachRow
{"id": 1, "data": {"user_id": 42, "action": "login"}}
{"id": 2, "data": {"user_id": 99, "action": "purchase", "amount": 150}};

SELECT data.user_id, data.action FROM semi_structured_events;
```

Note: `Object('json')` requires `allow_experimental_object_type = 1` and is being superseded by the new `JSON` type.

## Using the New JSON Type

ClickHouse 24.8+ introduced a redesigned native `JSON` type (production-ready in 25.3) that provides dot-notation access, automatic type inference per path, and better compression than `Object('json')`:

```sql
SET allow_experimental_json_type = 1;

CREATE TABLE json_events (
    id    UInt64,
    data  JSON
) ENGINE = MergeTree()
ORDER BY id;

INSERT INTO json_events FORMAT JSONEachRow
{"id": 1, "data": {"user_id": 42, "action": "login", "score": 9.8}}
{"id": 2, "data": {"user_id": 99, "action": "purchase", "amount": 150.0}};

-- Access subfields using dot notation
SELECT
    data.user_id,
    data.action,
    data.score
FROM json_events;
```

Each accessed path becomes a typed subcolumn stored efficiently. Paths not present in a row return NULL.

## Choosing the Right Approach

| Approach | Schema flexibility | Query performance | Best for |
|----------|-------------------|-------------------|---------|
| String + JSONExtract | Highest | Lowest | Exploratory, unpredictable JSON |
| simpleJSON | High | High | Flat, high-volume JSON |
| Object('json') | High | Medium | Legacy semi-structured |
| JSON type | High | High | Modern semi-structured (24.8+, GA in 25.3) |

## Summary

ClickHouse handles JSON through `String` columns with `JSONExtract*` functions for maximum flexibility, or via the newer `JSON` type for automatic path inference and efficient subcolumn storage. Use `JSONExtractString`, `JSONExtractInt`, and `JSONExtractFloat` for targeted field extraction from raw JSON strings, and the `JSON` type when you need dot-notation access and better compression on structured payloads.
