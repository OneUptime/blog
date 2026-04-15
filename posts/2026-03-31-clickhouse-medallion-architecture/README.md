# How to Use ClickHouse in a Medallion Architecture (Bronze/Silver/Gold)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Medallion Architecture, Data Lake, Bronze Silver Gold, Data Quality

Description: Implement the Bronze, Silver, and Gold medallion architecture in ClickHouse to progressively clean and enrich data while preserving the raw source of truth.

---

## What Is the Medallion Architecture

The medallion architecture organizes data into three quality layers:

- **Bronze** - raw ingested data, no transformation, full fidelity
- **Silver** - cleaned, deduplicated, and typed data
- **Gold** - business-level aggregates ready for dashboards and models

ClickHouse handles all three layers efficiently within a single cluster.

## Bronze Layer - Raw Ingestion

Accept data as-is, including schema inconsistencies. Use a flexible schema:

```sql
CREATE DATABASE bronze;

CREATE TABLE bronze.events_raw (
    ingested_at DateTime DEFAULT now(),
    source      LowCardinality(String),
    raw_data    String  -- raw JSON payload
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ingested_at)
ORDER BY ingested_at
TTL ingested_at + INTERVAL 90 DAY DELETE;
```

Insert from any producer without schema enforcement:

```bash
curl -X POST "http://ch.internal:8123/?query=INSERT+INTO+bronze.events_raw+(source,raw_data)+FORMAT+JSONEachRow" \
  --data-binary '{"source":"web","raw_data":"{\"user_id\":42,\"event\":\"click\"}"}'
```

## Silver Layer - Cleaned and Typed

A materialized view transforms bronze into silver on insert:

```sql
CREATE DATABASE silver;

CREATE TABLE silver.events (
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    session_id  String,
    properties  Map(String, String)
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time);

CREATE MATERIALIZED VIEW bronze.events_to_silver TO silver.events AS
SELECT
    parseDateTimeBestEffort(JSONExtractString(raw_data, 'timestamp')) AS event_time,
    JSONExtractUInt(raw_data, 'user_id') AS user_id,
    JSONExtractString(raw_data, 'event') AS event_type,
    JSONExtractString(raw_data, 'session_id') AS session_id,
    JSONExtract(raw_data, 'properties', 'Map(String,String)') AS properties
FROM bronze.events_raw
WHERE source = 'web'
  AND JSONHas(raw_data, 'user_id')
  AND JSONHas(raw_data, 'event');
```

## Gold Layer - Business Aggregates

Aggregate silver data into gold for reporting:

```sql
CREATE DATABASE gold;

CREATE TABLE gold.daily_user_activity (
    activity_date  Date,
    user_id        UInt64,
    sessions       AggregateFunction(uniq, String),
    events         SimpleAggregateFunction(sum, UInt64),
    distinct_types AggregateFunction(uniq, String)
) ENGINE = AggregatingMergeTree()
ORDER BY (activity_date, user_id);

CREATE MATERIALIZED VIEW silver.events_to_gold TO gold.daily_user_activity AS
SELECT
    toDate(event_time) AS activity_date,
    user_id,
    uniqState(session_id) AS sessions,
    count() AS events,
    uniqState(event_type) AS distinct_types
FROM silver.events
GROUP BY activity_date, user_id;
```

## Querying the Gold Layer

Dashboards query the gold layer for fast, pre-aggregated results:

```sql
SELECT
    activity_date,
    sum(events) AS total_events,
    uniqMerge(sessions) AS total_sessions,
    count(DISTINCT user_id) AS dau
FROM gold.daily_user_activity
WHERE activity_date >= today() - 30
GROUP BY activity_date
ORDER BY activity_date;
```

## Backfilling the Silver and Gold Layers

When logic changes in silver or gold, backfill from bronze:

```sql
INSERT INTO silver.events
SELECT ... FROM bronze.events_raw
WHERE ingested_at >= '2026-01-01'
  AND ingested_at < '2026-03-31';
```

## Summary

The medallion architecture in ClickHouse uses materialized views to progressively transform raw bronze data into cleaned silver and aggregated gold layers, balancing data fidelity preservation with query performance for dashboards.
