# How to Use JSONType() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON, Analytics, Query

Description: Learn how JSONType() identifies the JSON type of a field in ClickHouse, returning values like String, Int64, Array, or Object to help with dynamic schema inspection.

---

`JSONType` returns an `Enum8` describing the JSON type of a value at a given path within a JSON string. The possible return values are `String`, `Int64`, `UInt64`, `Double`, `Bool`, `Array`, `Object`, and `Null`. Note that `Null` is also returned when the key does not exist, so `JSONType` alone cannot distinguish a missing key from an explicit JSON `null` — pair it with `JSONHas` for that. This function is useful for inspecting the actual type before extracting, auditing mixed-type fields, and debugging payloads that do not conform to an expected schema.

## Basic Usage

```sql
-- Identify the JSON type of each field
SELECT
    JSONType('{"id": 1, "name": "Alice", "scores": [9, 8], "meta": {}}', 'id')     AS id_type,
    JSONType('{"id": 1, "name": "Alice", "scores": [9, 8], "meta": {}}', 'name')   AS name_type,
    JSONType('{"id": 1, "name": "Alice", "scores": [9, 8], "meta": {}}', 'scores') AS scores_type,
    JSONType('{"id": 1, "name": "Alice", "scores": [9, 8], "meta": {}}', 'meta')   AS meta_type;
```

```text
id_type  name_type  scores_type  meta_type
Int64    String     Array        Object
```

## Checking Types Before Extraction

```sql
-- Only extract as float if the value is actually numeric
SELECT
    event_id,
    JSONType(payload, 'amount')                                           AS amount_type,
    if(
        JSONType(payload, 'amount') IN ('Int64', 'UInt64', 'Double'),
        JSONExtractFloat(payload, 'amount'),
        0.0
    ) AS safe_amount
FROM events
LIMIT 10;
```

## Auditing a Column for Type Consistency

```sql
-- Count how many rows have each type for the 'value' field
SELECT
    JSONType(payload, 'value') AS value_type,
    count()                    AS row_count
FROM events
GROUP BY value_type
ORDER BY row_count DESC;
```

This reveals whether a field is ever `Null`, sometimes a `String` and sometimes a number, or contains nested objects when only scalars are expected.

## Detecting Missing vs Null

`JSONType` returns `'Null'` for both an absent key and a key set to JSON `null`, so it cannot tell them apart on its own. Combine it with `JSONHas` to distinguish the two cases.

```sql
-- Distinguish missing keys from explicit null values
SELECT
    event_id,
    JSONHas(payload, 'cancelled_at')  AS has_key,
    JSONType(payload, 'cancelled_at') AS cancelled_at_type
FROM events
WHERE NOT JSONHas(payload, 'cancelled_at')
   OR JSONType(payload, 'cancelled_at') = 'Null'
LIMIT 10;
```

## Filtering Rows That Have an Array Field

```sql
-- Only process rows where 'tags' is actually a JSON array
SELECT
    post_id,
    JSONExtractArrayRaw(metadata, 'tags') AS tags
FROM posts
WHERE JSONType(metadata, 'tags') = 'Array'
LIMIT 10;
```

## Checking Nested Field Types

```sql
-- Navigate into a nested object to check the type of an inner field
SELECT
    user_id,
    JSONType(profile, 'address', 'zip') AS zip_type
FROM users
LIMIT 10;
```

## Building a Schema Summary

```sql
-- Summarize the types of every top-level key across all payloads
SELECT
    field_name,
    JSONType(payload, field_name) AS field_type,
    count()                       AS occurrences
FROM events
ARRAY JOIN JSONExtractKeys(payload) AS field_name
GROUP BY field_name, field_type
ORDER BY field_name, occurrences DESC;
```

## Summary

`JSONType` exposes the runtime JSON type of a field, returning one of `String`, `Int64`, `UInt64`, `Double`, `Bool`, `Array`, `Object`, or `Null`. Note that `Null` is also returned when the key is absent, so combine it with `JSONHas` to distinguish a missing key from an explicit JSON `null`. Use it to audit columns for unexpected type variance and guard extraction logic with type checks. It is especially helpful when ingesting data from external systems that do not enforce a strict schema.
