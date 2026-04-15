# How to Use Variant and Dynamic Data Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Variant, Dynamic, Semi-Structured, Data Type

Description: Learn how to use ClickHouse Variant and Dynamic data types to store heterogeneous values in a single column without losing type safety.

---

ClickHouse introduced `Variant` and `Dynamic` types to handle semi-structured and heterogeneous data. These types allow a single column to store values of different types without converting everything to a string.

## The Variant Type

`Variant(T1, T2, ...)` stores values of one of several specified types in a single column. Each value knows its type, and type-specific operations work correctly:

```sql
-- Required when mixing similar numeric types (e.g. UInt64 and Float64) in one Variant
SET allow_suspicious_variant_types = 1;

CREATE TABLE events (
    event_time DateTime,
    event_type String,
    value Variant(UInt64, Float64, String, Array(String))
)
ENGINE = MergeTree()
ORDER BY event_time;
```

Insert different types into the same column:

```sql
INSERT INTO events VALUES
    (now(), 'page_view', 1::UInt64),
    (now(), 'load_time', 0.245::Float64),
    (now(), 'page_title', 'Home Page'::String),
    (now(), 'tags', ['analytics', 'web']::Array(String));
```

## Reading Variant Values

Use `variantType()` to check the type and type-specific functions to extract values:

```sql
SELECT
    event_type,
    variantType(value) AS value_type,
    value::UInt64 AS numeric_value,
    value::String AS string_value
FROM events
WHERE event_type IN ('page_view', 'page_title');
```

Filter by type:

```sql
SELECT
    event_time,
    value::Float64 AS load_time_seconds
FROM events
WHERE event_type = 'load_time'
  AND variantType(value) = 'Float64';
```

## The Dynamic Type

`Dynamic` is more flexible than `Variant` - it can store any type without pre-specifying the list:

```sql
CREATE TABLE flexible_events (
    event_time DateTime,
    key String,
    val Dynamic
)
ENGINE = MergeTree()
ORDER BY (key, event_time);
```

```sql
INSERT INTO flexible_events VALUES
    (now(), 'count', 42),
    (now(), 'ratio', 0.75),
    (now(), 'label', 'success'),
    (now(), 'ids', [1, 2, 3]);
```

Query dynamic columns:

```sql
SELECT
    key,
    dynamicType(val) AS type,
    val
FROM flexible_events;
```

## Practical Use Case: Event Properties

Use `Dynamic` for event properties where different event types have different schemas:

```sql
CREATE TABLE product_events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32,
    -- Different events have different properties
    product_id Dynamic,
    price Dynamic,
    category Dynamic
)
ENGINE = MergeTree()
ORDER BY (event_type, event_time);
```

## JSON Integration

Dynamic types work naturally with JSON ingestion:

```sql
INSERT INTO flexible_events
SELECT
    now(),
    key,
    value::Dynamic
FROM (
    SELECT JSONExtractKeysAndValues('{"count": 5, "label": "ok"}', 'Dynamic') AS kv
)
ARRAY JOIN kv.1 AS key, kv.2 AS value;
```

## Summary

ClickHouse `Variant` and `Dynamic` types provide type-safe heterogeneous storage in a single column. `Variant` is best when you know the possible types in advance, while `Dynamic` handles fully open schemas. Both avoid the performance penalty of storing all values as strings and enable type-specific operations at query time.
