# How to Build a Streaming ETL Pipeline into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ETL, Streaming, Kafka, Materialized View, Data Pipeline

Description: Build a production-grade streaming ETL pipeline that transforms and loads data from Kafka into ClickHouse using materialized views.

---

A streaming ETL pipeline continuously extracts data from a source, transforms it, and loads it into ClickHouse. This guide covers building such a pipeline using Kafka as the transport layer and ClickHouse materialized views for in-flight transformation.

## Pipeline Architecture

```text
Source Systems
     |
     v
Kafka Topics (raw data)
     |
     v
ClickHouse Kafka Engine (staging tables)
     |
     v
Materialized Views (transformation)
     |
     v
MergeTree Tables (final storage)
```

## Step 1: Create the Kafka Staging Table

```sql
CREATE TABLE raw_events_queue (
    raw_data String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'raw-events',
    kafka_group_name = 'clickhouse-etl',
    kafka_format = 'JSONAsString',
    kafka_num_consumers = 4;
```

## Step 2: Create the Target Table

```sql
CREATE TABLE events (
    event_time DateTime,
    event_date Date DEFAULT toDate(event_time),
    event_type LowCardinality(String),
    user_id UInt32,
    country LowCardinality(String),
    revenue Decimal(18, 4)
) ENGINE = MergeTree()
PARTITION BY event_date
ORDER BY (event_type, event_time, user_id);
```

## Step 3: Create the Transformation Materialized View

```sql
CREATE MATERIALIZED VIEW etl_raw_to_events TO events AS
SELECT
    toDateTime(JSONExtractString(raw_data, 'ts')) AS event_time,
    JSONExtractString(raw_data, 'type') AS event_type,
    toUInt32(JSONExtractInt(raw_data, 'uid')) AS user_id,
    upper(JSONExtractString(raw_data, 'country')) AS country,
    toDecimal64(JSONExtractFloat(raw_data, 'revenue'), 4) AS revenue
FROM raw_events_queue
WHERE JSONExtractString(raw_data, 'type') != '';
```

## Step 4: Handle Schema Evolution

When the source schema changes, add new columns with defaults:

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS app_version LowCardinality(String) DEFAULT 'unknown';
```

Update the materialized view to populate the new column:

```sql
-- Drop and recreate the materialized view
DROP VIEW etl_raw_to_events;

CREATE MATERIALIZED VIEW etl_raw_to_events TO events AS
SELECT
    toDateTime(JSONExtractString(raw_data, 'ts')) AS event_time,
    JSONExtractString(raw_data, 'type') AS event_type,
    toUInt32(JSONExtractInt(raw_data, 'uid')) AS user_id,
    upper(JSONExtractString(raw_data, 'country')) AS country,
    toDecimal64(JSONExtractFloat(raw_data, 'revenue'), 4) AS revenue,
    coalesce(nullIf(JSONExtractString(raw_data, 'app_version'), ''), 'unknown') AS app_version
FROM raw_events_queue
WHERE JSONExtractString(raw_data, 'type') != '';
```

## Dead Letter Queue for Failed Records

Route malformed records to a separate error table. Add `kafka_handle_error_mode = 'stream'` to the Kafka table so that failed rows expose `_error` and `_raw_message` virtual columns instead of stopping consumption:

```sql
ALTER TABLE raw_events_queue
MODIFY SETTING kafka_handle_error_mode = 'stream';

CREATE TABLE etl_errors (
    ingested_at DateTime DEFAULT now(),
    raw_message String,
    error String
) ENGINE = MergeTree()
ORDER BY ingested_at;

CREATE MATERIALIZED VIEW etl_errors_mv TO etl_errors AS
SELECT
    now() AS ingested_at,
    _raw_message AS raw_message,
    _error AS error
FROM raw_events_queue
WHERE _error != '';
```

## Monitor Pipeline Health

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS rows,
    uniq(user_id) AS unique_users
FROM events
WHERE event_time > now() - INTERVAL 10 MINUTE
GROUP BY minute
ORDER BY minute DESC;
```

## Summary

A ClickHouse streaming ETL pipeline uses Kafka engine staging tables as the entry point and materialized views for in-flight transformation. This architecture keeps transformation logic close to the data, scales with Kafka partitions, and avoids separate transformation infrastructure. Use dead letter queues and monitor insert rates to keep the pipeline healthy.
