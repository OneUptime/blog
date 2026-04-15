# How to Transform Data On-The-Fly During ClickHouse Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ETL, Data Transformation, Materialized View, Ingestion, Pipeline

Description: Learn how to transform data on-the-fly during ClickHouse ingestion using materialized views, default expressions, and INSERT-SELECT patterns.

---

Transforming data at ingestion time reduces query complexity and pre-computes values that would otherwise be recalculated on every read. ClickHouse provides multiple mechanisms for inline transformation during inserts.

## Approach 1: Materialized Views as Transform Pipeline

The most powerful approach is using a materialized view as a streaming transformer between a raw staging table and a clean target table:

```sql
-- Raw landing table (receives all inserts)
CREATE TABLE raw_events (
    raw_json String,
    received_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY received_at;

-- Clean target table
CREATE TABLE clean_events (
    event_id String,
    user_id UInt64,
    event_type String,
    timestamp DateTime,
    country String
) ENGINE = MergeTree()
ORDER BY (event_type, timestamp);

-- Transform on the fly
CREATE MATERIALIZED VIEW raw_to_clean_mv TO clean_events AS
SELECT
    JSONExtractString(raw_json, 'event_id') AS event_id,
    JSONExtractUInt(raw_json, 'user_id') AS user_id,
    lower(JSONExtractString(raw_json, 'type')) AS event_type,
    fromUnixTimestamp(JSONExtractUInt(raw_json, 'ts')) AS timestamp,
    upper(JSONExtractString(raw_json, 'geo', 'country')) AS country
FROM raw_events
WHERE JSONExtractString(raw_json, 'event_id') != '';
```

Every insert into `raw_events` automatically populates `clean_events`.

## Approach 2: DEFAULT and MATERIALIZED Column Expressions

Define transformation logic in the table schema itself:

```sql
CREATE TABLE events (
    raw_timestamp String,
    timestamp DateTime MATERIALIZED parseDateTimeBestEffort(raw_timestamp),
    event_json String,
    event_type String MATERIALIZED lower(JSONExtractString(event_json, 'type')),
    user_id UInt64 MATERIALIZED JSONExtractUInt(event_json, 'user_id'),
    date Date MATERIALIZED toDate(timestamp)
) ENGINE = MergeTree()
ORDER BY (event_type, timestamp);
```

Columns marked `MATERIALIZED` are computed automatically on insert and stored on disk.

## Approach 3: INSERT-SELECT with Transformations

For batch ETL, apply transformations inline in the INSERT-SELECT:

```sql
INSERT INTO events_clean (event_id, user_id, event_type, timestamp, revenue_usd)
SELECT
    event_id,
    user_id,
    lower(trim(event_type)) AS event_type,
    toDateTime(timestamp_ms / 1000) AS timestamp,
    if(currency = 'EUR', revenue * 1.1, revenue) AS revenue_usd
FROM events_raw
WHERE length(event_id) = 36
  AND user_id > 0;
```

## Approach 4: Dictionary Lookups During Ingestion

Enrich data with dictionary lookups at insert time:

```sql
CREATE DICTIONARY country_codes (
    code String,
    name String
) PRIMARY KEY code
SOURCE(CLICKHOUSE(TABLE 'country_lookup'))
LAYOUT(HASHED())
LIFETIME(3600);

INSERT INTO events_enriched
SELECT
    event_id,
    user_id,
    country_code,
    dictGet('country_codes', 'name', country_code) AS country_name,
    timestamp
FROM events_raw;
```

## Approach 5: Format Transformations via HTTP Interface

Use the HTTP interface to accept CSV and transform to typed columns:

```bash
curl -X POST 'http://localhost:8123/?query=INSERT+INTO+events+FORMAT+CSVWithNames' \
    --data-binary @events.csv
```

For JSON with nested fields:

```bash
curl -X POST \
    'http://localhost:8123/?query=INSERT+INTO+events+SELECT+event_id,+user_id,+toDateTime(ts)+FROM+input(%27event_id+String,+user_id+UInt64,+ts+UInt64%27)+FORMAT+JSONEachRow' \
    --data-binary @events.ndjson
```

## Summary

ClickHouse supports data transformation during ingestion through materialized views, MATERIALIZED column expressions, INSERT-SELECT queries, and dictionary enrichment. Materialized views are the most flexible approach for streaming pipelines, while MATERIALIZED columns are ideal for simple derivations that should be transparent to the insert process.
