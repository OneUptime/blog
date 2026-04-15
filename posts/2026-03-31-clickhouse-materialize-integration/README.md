# How to Use Materialize with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialize, Streaming SQL, Data Pipeline, Integration, Real-Time

Description: Combine Materialize for real-time streaming SQL with ClickHouse for historical analytics to build a low-latency data stack.

---

Materialize is a streaming SQL database that maintains views incrementally in real-time. Combining it with ClickHouse allows you to use Materialize for low-latency operational queries and ClickHouse for historical analytics and batch reporting.

## Architecture

```text
Source Systems --> Materialize (real-time views) --> ClickHouse (historical analytics)
                       |
                       --> Application Queries (sub-second latency)
```

## Use Case: Streaming Aggregation then Historical Storage

Materialize continuously updates aggregated views, which you periodically snapshot into ClickHouse for long-term storage.

## Set Up Materialize Source

In Materialize, create a Kafka source and a streaming view:

```sql
-- Materialize SQL
CREATE SOURCE events_source
FROM KAFKA CONNECTION kafka_conn (TOPIC 'events')
FORMAT JSON;

-- FORMAT JSON produces a single 'data' column of type jsonb;
-- create a parsing view to extract typed columns.
CREATE VIEW events AS
SELECT
    (data->>'event_time')::timestamptz AS event_time,
    data->>'event_type' AS event_type,
    data->>'user_id' AS user_id
FROM events_source;

CREATE MATERIALIZED VIEW hourly_event_counts AS
SELECT
    date_trunc('hour', event_time) AS hour,
    event_type,
    count(*) AS event_count,
    count(DISTINCT user_id) AS unique_users
FROM events
GROUP BY 1, 2;
```

## Sink from Materialize to Kafka

Export Materialize view updates to Kafka, which ClickHouse can consume:

```sql
-- Materialize SQL
CREATE SINK hourly_counts_sink
FROM hourly_event_counts
INTO KAFKA CONNECTION kafka_conn (TOPIC 'hourly-counts')
KEY (hour, event_type)
FORMAT JSON
ENVELOPE UPSERT;
```

## Consume in ClickHouse

Set up a Kafka engine in ClickHouse to receive Materialize output:

```sql
CREATE TABLE hourly_counts_queue (
    hour DateTime,
    event_type String,
    event_count UInt64,
    unique_users UInt64
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list = 'hourly-counts',
    kafka_group_name = 'clickhouse-materialize',
    kafka_format = 'JSONEachRow';

CREATE TABLE hourly_counts (
    hour DateTime,
    event_type LowCardinality(String),
    event_count UInt64,
    unique_users UInt64
) ENGINE = ReplacingMergeTree()
ORDER BY (hour, event_type);

CREATE MATERIALIZED VIEW hourly_counts_mv TO hourly_counts AS
SELECT * FROM hourly_counts_queue;
```

## Direct Query Comparison

For operational dashboards, query Materialize directly for the latest data:

```sql
-- Materialize: real-time, last few minutes
SELECT * FROM hourly_event_counts WHERE hour >= now() - INTERVAL '1 hour';
```

For historical analysis, query ClickHouse:

```sql
-- ClickHouse: historical, months of data
SELECT
    toStartOfWeek(hour) AS week,
    event_type,
    sum(event_count) AS weekly_events
FROM hourly_counts
WHERE hour >= now() - INTERVAL 90 DAY
GROUP BY week, event_type
ORDER BY week DESC, weekly_events DESC;
```

## Data Sync via Batch Export

For simpler setups, periodically export Materialize query results to ClickHouse via HTTP:

```bash
psql -h materialize-host -U materialize -c \
  "COPY (SELECT * FROM hourly_event_counts) TO STDOUT CSV" | \
  clickhouse-client --query="INSERT INTO hourly_counts FORMAT CSV"
```

## Summary

Materialize and ClickHouse complement each other: Materialize provides sub-second freshness for operational queries, while ClickHouse excels at historical analytics over large datasets. Route Materialize output through Kafka to ClickHouse for a fully streaming, low-latency data platform. Use ReplacingMergeTree in ClickHouse to handle Materialize's upsert-style output.
