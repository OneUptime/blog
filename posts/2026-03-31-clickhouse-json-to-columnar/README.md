# How to Transform JSON Data into Columnar Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JSON, Schema Design, Performance, Analytics

Description: Learn how to transform JSON strings stored in ClickHouse into proper columnar format using materialized columns, INSERT SELECT pipelines, and computed column strategies.

---

Storing raw JSON strings in a `String` column and parsing them at query time is convenient but expensive at scale. The right approach is to transform JSON into a columnar format: either at insert time using materialized columns, or as a one-time migration using `INSERT ... SELECT` with `JSONExtract*` functions. Columnar storage lets ClickHouse use compression, primary index scans, and vectorized execution on individual fields rather than re-parsing JSON on every query.

## Option 1: Materialized Columns

Materialized columns compute their value automatically from another column at insert time and are stored on disk.

```sql
-- Add materialized columns to extract fields from a JSON payload column
ALTER TABLE events
    ADD COLUMN user_id     String  MATERIALIZED JSONExtractString(payload, 'user_id'),
    ADD COLUMN duration_ms Int64   MATERIALIZED JSONExtractInt(payload, 'duration_ms'),
    ADD COLUMN status_code UInt16  MATERIALIZED JSONExtractInt(payload, 'status_code'),
    ADD COLUMN country     String  MATERIALIZED JSONExtractString(payload, 'geo', 'country');
```

After adding, existing rows need a back-fill to populate the new columns.

```sql
-- Back-fill materialized columns for existing data
ALTER TABLE events MATERIALIZE COLUMN user_id;
ALTER TABLE events MATERIALIZE COLUMN duration_ms;
ALTER TABLE events MATERIALIZE COLUMN status_code;
ALTER TABLE events MATERIALIZE COLUMN country;
```

## Option 2: INSERT SELECT Migration

Create a new table with a proper schema and migrate data from the JSON column.

```sql
-- Create the target columnar table
CREATE TABLE events_columnar (
    event_id    String,
    event_time  DateTime,
    user_id     String,
    session_id  String,
    event_type  String,
    duration_ms Int64,
    country     String,
    is_mobile   UInt8
) ENGINE = MergeTree()
ORDER BY (event_time, user_id);

-- Migrate from the JSON source table
INSERT INTO events_columnar
SELECT
    event_id,
    event_time,
    JSONExtractString(payload, 'user_id')          AS user_id,
    JSONExtractString(payload, 'session_id')       AS session_id,
    JSONExtractString(payload, 'event_type')       AS event_type,
    JSONExtractInt(payload, 'duration_ms')         AS duration_ms,
    JSONExtractString(payload, 'geo', 'country')   AS country,
    JSONExtractBool(payload, 'is_mobile')          AS is_mobile
FROM events_raw;
```

## Option 3: Materialized View for Ongoing Ingestion

A materialized view transforms incoming JSON rows into columnar rows automatically.

```sql
-- Source table receives raw JSON
CREATE TABLE events_raw (
    received_at DateTime,
    payload     String
) ENGINE = MergeTree()
ORDER BY received_at;

-- Target table with columnar schema
CREATE TABLE events_structured (
    received_at DateTime,
    user_id     String,
    event_type  String,
    duration_ms Int64
) ENGINE = MergeTree()
ORDER BY (received_at, user_id);

-- Materialized view transforms rows on insert
CREATE MATERIALIZED VIEW events_mv TO events_structured AS
SELECT
    received_at,
    JSONExtractString(payload, 'user_id')    AS user_id,
    JSONExtractString(payload, 'event_type') AS event_type,
    JSONExtractInt(payload, 'duration_ms')   AS duration_ms
FROM events_raw;
```

## Querying After Transformation

Once data is columnar, queries no longer need JSON parsing.

```sql
-- Fast query on native columns: no JSONExtract needed
SELECT
    event_type,
    avg(duration_ms) AS avg_duration_ms,
    count()          AS event_count
FROM events_structured
WHERE
    received_at >= now() - INTERVAL 1 DAY
    AND country = 'US'
GROUP BY event_type
ORDER BY avg_duration_ms DESC;
```

## Partial Transformation: Keep JSON, Add Key Columns

When you cannot change the schema but want fast filtering, add only the high-cardinality filter columns as materialized columns and keep the full JSON for ad-hoc extraction.

```sql
ALTER TABLE events
    ADD COLUMN event_type String MATERIALIZED JSONExtractString(payload, 'event_type'),
    ADD COLUMN user_id    String MATERIALIZED JSONExtractString(payload, 'user_id');

-- Create a secondary index on the materialized column
ALTER TABLE events
    ADD INDEX idx_event_type event_type TYPE bloom_filter GRANULARITY 4;
```

## Summary

Transforming JSON to columnar format in ClickHouse follows three patterns: materialized columns for transparent in-place extraction, `INSERT ... SELECT` pipelines for full schema migrations, and materialized views for ongoing streaming transformation. All three use the same `JSONExtract*` functions at write time rather than read time, eliminating per-query parsing overhead and enabling index scans, compression, and vectorized execution on individual fields.
