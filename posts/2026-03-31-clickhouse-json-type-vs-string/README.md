# How to Use JSON Data Type vs String with JSONExtract in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON, Schema Design, Performance, Analytics

Description: Learn the differences between ClickHouse's native JSON data type and storing JSON in String columns with JSONExtract, and when to choose each approach for your workloads.

---

ClickHouse offers two primary ways to work with JSON data. The first is storing JSON as a `String` column and using `JSONExtract*` functions at query time. The second is using the native `JSON` data type (introduced in ClickHouse 24.8 and marked production-ready in 25.3), which parses JSON at insert time, stores sub-columns in a columnar format, and allows field access without `JSONExtract` syntax. Each approach has different trade-offs for schema flexibility, query performance, storage, and maturity.

## String Column with JSONExtract

The traditional approach stores raw JSON text and parses it on every read.

```sql
-- Create a table that stores JSON as a String
CREATE TABLE events_string (
    event_id   String,
    event_time DateTime,
    payload    String
) ENGINE = MergeTree()
ORDER BY event_time;

-- Query using JSONExtract functions
SELECT
    JSONExtractString(payload, 'user_id')    AS user_id,
    JSONExtractString(payload, 'event_type') AS event_type,
    JSONExtractInt(payload, 'duration_ms')   AS duration_ms
FROM events_string
LIMIT 10;
```

Advantages: universal compatibility, no schema defined upfront, easy to ingest raw data without preprocessing.
Disadvantage: parsing cost on every query, no index support on JSON fields without materialized columns.

## Native JSON Data Type

The `JSON` type parses and stores JSON sub-columns automatically.

```sql
-- Create a table using the native JSON data type
CREATE TABLE events_json_type (
    event_id   String,
    event_time DateTime,
    payload    JSON
) ENGINE = MergeTree()
ORDER BY event_time;
```

Access fields using dot notation on the `payload` column.

```sql
-- Access JSON sub-columns directly with dot notation
SELECT
    payload.user_id,
    payload.event_type,
    payload.duration_ms
FROM events_json_type
LIMIT 10;
```

## Inserting Data into Both Types

```sql
-- Insert into the String column table
INSERT INTO events_string (event_id, event_time, payload) VALUES
    ('e1', now(), '{"user_id": "u42", "event_type": "click", "duration_ms": 120}');

-- Insert into the JSON type table (same row format)
INSERT INTO events_json_type (event_id, event_time, payload) VALUES
    ('e1', now(), '{"user_id": "u42", "event_type": "click", "duration_ms": 120}');
```

## Performance Comparison: Aggregation

With `String` plus `JSONExtract`:

```sql
-- Parse at query time
SELECT
    JSONExtractString(payload, 'event_type') AS event_type,
    avg(JSONExtractInt(payload, 'duration_ms')) AS avg_duration
FROM events_string
GROUP BY event_type;
```

With the native `JSON` type:

```sql
-- Sub-columns are stored and read like native columns
SELECT
    payload.event_type,
    avg(payload.duration_ms)
FROM events_json_type
GROUP BY payload.event_type;
```

The `JSON` type avoids parsing overhead at read time and benefits from per-sub-column compression.

## Handling Dynamic Keys

The `JSON` type stores any key it encounters, making it naturally flexible for dynamic schemas.

```sql
-- Discover the sub-columns that exist in the JSON type column
DESCRIBE TABLE events_json_type;
```

The output includes inferred sub-columns based on the data inserted. New keys in incoming JSON are added automatically.

## Mixing Approaches: JSON Type with Explicit Sub-Columns

```sql
-- Declare specific typed sub-columns and let the rest be dynamic
CREATE TABLE events_hybrid (
    event_id   String,
    event_time DateTime,
    payload    JSON(
        user_id     String,
        duration_ms Int64
    )
) ENGINE = MergeTree()
ORDER BY event_time;
```

Explicitly typed sub-columns use the declared type; all other keys are stored dynamically.

## When to Use Each Approach

Use `String` with `JSONExtract` when:
- You need compatibility with older ClickHouse versions
- You want to keep the raw JSON for forwarding or debugging
- The JSON schema changes infrequently and materialized columns cover query-time needs

Use the native `JSON` type when:
- The JSON schema is dynamic or has many distinct keys
- You want automatic sub-column storage and compression without managing materialized columns
- You are running ClickHouse 25.3 or later (where the `JSON` type is production-ready), or an earlier 24.8+ version and can accept a beta/experimental feature

## Summary

`String` with `JSONExtract` is the battle-tested, universally supported approach that trades query-time CPU for schema flexibility. The native `JSON` type stores parsed sub-columns automatically, eliminating per-query parsing and enabling native column compression, but it is newer and requires a supported ClickHouse version. For high-traffic filter columns with a known schema, materialized columns on a `String` payload are a pragmatic middle ground that delivers index support without changing the storage model.
