# How to Optimize JSON Parsing Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON, Performance, Query Optimization, JSONExtract, Schema Design

Description: Learn how to optimize JSON parsing in ClickHouse by choosing the right storage strategy, using typed extract functions, and pre-parsing at insert time.

---

JSON parsing in ClickHouse is flexible but expensive. Every call to `JSONExtractString`, `JSONExtractInt`, or similar functions parses the entire JSON blob for each row. Optimizing JSON handling often yields 10-100x query speedups.

## The Cost of Runtime JSON Parsing

Parsing JSON at query time is slow because:
- It re-parses the full JSON string for every row, every query
- JSON blobs prevent compression optimization
- No index or min/max pruning is possible on JSON fields

## Strategy 1: Pre-Parse at Insert Time

The best optimization is to never store JSON as a blob. Extract fields during ingestion:

```sql
-- Bad: stores raw JSON, must parse every query
CREATE TABLE events_json (
    event_id UInt64,
    event_time DateTime,
    payload String  -- raw JSON here
) ENGINE = MergeTree()
ORDER BY (event_time, event_id);

-- Good: extract fields at insert time
CREATE TABLE events_parsed (
    event_id UInt64,
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    country LowCardinality(String),
    amount Decimal(18, 2)
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- Parse at insert time
INSERT INTO events_parsed
SELECT
    event_id,
    event_time,
    JSONExtractUInt(payload, 'user_id'),
    JSONExtractString(payload, 'event_type'),
    JSONExtractString(payload, 'country'),
    toDecimal64(JSONExtractString(payload, 'amount'), 2)
FROM events_json;
```

## Strategy 2: Use Typed Extract Functions

Prefer the typed variant of JSONExtract for clarity and type safety:

```sql
-- Generic extract with type string
SELECT JSONExtract(payload, 'amount', 'Float64') FROM events;

-- Typed function (clearer intent, avoids type-string parsing)
SELECT JSONExtractFloat(payload, 'amount') FROM events;
```

Available typed functions:
```sql
JSONExtractUInt(json, 'field')
JSONExtractInt(json, 'field')
JSONExtractFloat(json, 'field')
JSONExtractBool(json, 'field')
JSONExtractString(json, 'field')
JSONExtractArrayRaw(json, 'field')
```

## Strategy 3: Extract Multiple Fields in One Pass

`JSONExtract` with a tuple type extracts multiple fields in a single parse:

```sql
-- Bad: parses JSON 3 times
SELECT
    JSONExtractString(payload, 'user_id'),
    JSONExtractString(payload, 'event_type'),
    JSONExtractFloat(payload, 'amount')
FROM events;

-- Better: parse once with tuple extract
SELECT
    t.1 AS user_id,
    t.2 AS event_type,
    t.3 AS amount
FROM (
    SELECT JSONExtract(payload, 'Tuple(user_id String, event_type String, amount Float64)') AS t
    FROM events
);
```

## Strategy 4: Use JSON Type (ClickHouse 25.3+)

ClickHouse introduced an experimental `JSON` type in version 24.8, which became production-ready in version 25.3. This native type provides columnar storage for JSON data:

```sql
CREATE TABLE events_native (
    event_id UInt64,
    event_time DateTime,
    payload JSON
) ENGINE = MergeTree()
ORDER BY (event_time, event_id);

-- Insert directly
INSERT INTO events_native FORMAT JSONEachRow
{"event_id": 1, "event_time": "2026-01-01 00:00:00", "payload": {"user_id": 1001, "amount": 99.99}}
```

Query individual paths without full parsing:

```sql
SELECT payload.user_id, payload.amount
FROM events_native
WHERE payload.event_type = 'purchase';
```

## Strategy 5: Materialized Columns for Common Fields

Extract frequently-queried JSON fields as materialized columns:

```sql
ALTER TABLE events_json
ADD COLUMN user_id UInt64 MATERIALIZED JSONExtractUInt(payload, 'user_id'),
ADD COLUMN event_type String MATERIALIZED JSONExtractString(payload, 'event_type');

-- Now filter on materialized column (computed once at insert)
SELECT count() FROM events_json WHERE event_type = 'purchase';
```

## Measuring JSON Parse Cost

```sql
SELECT
    query_duration_ms,
    ProfileEvents['FunctionExecute'] AS function_calls,
    read_rows
FROM system.query_log
WHERE query LIKE '%JSONExtract%'
  AND type = 'QueryFinish'
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## Summary

Optimize JSON parsing in ClickHouse by pre-extracting fields at insert time, using typed extract functions, extracting multiple fields in a single parse pass, leveraging materialized columns for frequent extractions, and migrating to the native JSON type in ClickHouse 25.3+ for columnar JSON storage. Runtime JSON parsing should be a last resort for truly dynamic schemas.
