# How to Handle Semi-Structured Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Semi-Structured Data, JSON, Dynamic Column, Schema Design

Description: Learn how to store, query, and optimize semi-structured data in ClickHouse using JSON columns, dynamic types, and materialized views.

---

## Why Semi-Structured Data Is Tricky in ClickHouse

ClickHouse is a column-oriented database designed for rigid, typed schemas. Semi-structured data - such as JSON events with varying fields - challenges this model. You have three main strategies: flatten everything upfront, use JSON/Dynamic columns, or use a hybrid approach.

## Strategy 1 - Flatten at Ingest

The simplest approach is to extract known fields at ingest time and store them as typed columns.

```sql
CREATE TABLE events (
    event_id   UUID,
    event_type LowCardinality(String),
    user_id    UInt64,
    timestamp  DateTime,
    country    LowCardinality(String),
    amount     Nullable(Float64)
) ENGINE = MergeTree()
ORDER BY (event_type, timestamp);
```

This gives the best query performance but requires schema changes when new fields appear.

## Strategy 2 - Use the JSON Data Type

ClickHouse 24.8+ introduced the new experimental `JSON` data type (enabled via `allow_experimental_json_type`). It became production-ready in version 25.3.

```sql
SET allow_experimental_json_type = 1;

CREATE TABLE raw_events (
    id        UUID,
    ts        DateTime,
    payload   JSON
) ENGINE = MergeTree()
ORDER BY ts;
```

Insert semi-structured data directly:

```sql
INSERT INTO raw_events FORMAT JSONEachRow
{"id":"abc","ts":"2026-01-01 00:00:00","payload":{"event":"purchase","amount":99.9,"user":{"id":42}}}
```

Query nested fields:

```sql
SELECT payload.event, payload.user.id, payload.amount
FROM raw_events
WHERE payload.event = 'purchase';
```

## Strategy 3 - Store Raw JSON + Materialized Views

Store the raw string and extract fields into a typed table via a materialized view.

```sql
CREATE TABLE raw_json (
    id  UUID,
    ts  DateTime,
    raw String
) ENGINE = MergeTree()
ORDER BY ts;

CREATE MATERIALIZED VIEW events_mv
ENGINE = MergeTree()
ORDER BY (event_type, ts)
AS SELECT
    id,
    ts,
    JSONExtractString(raw, 'event') AS event_type,
    JSONExtractFloat(raw, 'amount') AS amount,
    JSONExtractUInt(raw, 'user', 'id') AS user_id
FROM raw_json;
```

## Querying Dynamic Keys

When you don't know field names ahead of time, use `JSONExtractKeys`:

```sql
SELECT JSONExtractKeys(raw) AS keys
FROM raw_json
LIMIT 5;
```

## Performance Tips

- Avoid storing large blobs in JSON columns on hot paths - materialized extraction is faster for frequent queries.
- Use `LowCardinality(String)` for enum-like extracted fields.
- Add bloom filter indexes on frequently filtered string fields.

```sql
ALTER TABLE events ADD INDEX bf_event_type event_type TYPE bloom_filter(0.01) GRANULARITY 1;
```

## Summary

ClickHouse handles semi-structured data through flattening at ingest, the experimental JSON type, or a raw-plus-materialized-view pattern. The hybrid approach - storing raw JSON while extracting hot fields via materialized views - gives both flexibility and query performance for production workloads.
