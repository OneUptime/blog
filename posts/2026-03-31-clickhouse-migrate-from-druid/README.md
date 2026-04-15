# How to Migrate from Druid to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Druid, Migration, Database, Analytics, Time-Series

Description: Migrate Apache Druid datasources to ClickHouse by exporting segments, mapping Druid dimensions and metrics to ClickHouse columns, and rewriting Druid SQL queries.

---

Apache Druid is a real-time analytics database designed for sub-second queries over event streams. It uses a custom segment format, a complex cluster architecture (Coordinators, Brokers, Historicals, MiddleManagers), and a proprietary query language. ClickHouse achieves similar or better query performance with a simpler architecture, standard SQL, and lower operational overhead. This guide covers migrating from Druid to ClickHouse.

## Architectural Comparison

| Feature | Druid | ClickHouse |
|---------|-------|------------|
| Query language | Druid SQL / native JSON | Standard SQL |
| Cluster roles | Coordinator, Broker, Historical, MiddleManager, Router | Server (or replicated cluster) |
| Storage format | Segments (custom columnar) | MergeTree parts (columnar) |
| Ingestion | Kafka, S3, batch specs | INSERT, Kafka engine, S3 |
| Real-time | Yes (Kafka indexing service) | Yes (Kafka table engine) |
| Rollup | Pre-aggregation during ingestion | Materialized views or SummingMergeTree |
| Retention | Set per datasource | TTL clause on table |

## Druid Data Model vs ClickHouse

Druid uses three column types:
- **Timestamp**: the mandatory `__time` column
- **Dimensions**: string-typed filtering columns
- **Metrics**: numeric aggregated columns

ClickHouse has no concept of dimension vs metric. All columns are equal. Rollup (pre-aggregation) is done through `SummingMergeTree` or materialized views rather than ingestion-time rollup.

## Step 1: Inspect Your Druid Datasource

List datasources and their metadata:

```bash
curl http://druid-coordinator:8081/druid/coordinator/v1/datasources
```

Get segment metadata for a datasource:

```bash
curl "http://druid-broker:8082/druid/v2/sql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM sys.segments WHERE datasource = '\''events'\'' LIMIT 5"
  }'
```

Get column details:

```bash
curl "http://druid-broker:8082/druid/v2/sql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '\''events'\'' AND TABLE_SCHEMA = '\''druid'\''"
  }'
```

## Step 2: Map Druid Schema to ClickHouse

Example Druid ingestion spec dimensions and metrics:

```json
{
  "dataSchema": {
    "dataSource": "events",
    "timestampSpec": { "column": "ts", "format": "iso" },
    "dimensionsSpec": {
      "dimensions": [
        "user_id",
        "session_id",
        "event_type",
        "page",
        "country"
      ]
    },
    "metricsSpec": [
      { "type": "count",     "name": "event_count" },
      { "type": "doubleSum", "name": "revenue",     "fieldName": "amount" },
      { "type": "HLLSketchBuild", "name": "unique_users", "fieldName": "user_id" }
    ],
    "granularitySpec": {
      "segmentGranularity": "DAY",
      "queryGranularity": "HOUR",
      "rollup": true
    }
  }
}
```

Equivalent ClickHouse schema (with rollup via SummingMergeTree):

```sql
CREATE TABLE events
(
    ts           DateTime,
    user_id      String,
    session_id   String,
    event_type   LowCardinality(String),
    page         String,
    country      LowCardinality(String),
    event_count  UInt64,
    revenue      Float64
)
ENGINE = SummingMergeTree((event_count, revenue))
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, country, user_id, ts);
```

For raw (non-rolled-up) data:

```sql
CREATE TABLE events_raw
(
    ts         DateTime64(3),
    user_id    String,
    session_id String,
    event_type LowCardinality(String),
    page       String,
    country    LowCardinality(String),
    amount     Float64        DEFAULT 0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts)
TTL ts + INTERVAL 90 DAY;
```

## Step 3: Export Druid Data

Export via Druid SQL to CSV:

```bash
curl -X POST "http://druid-broker:8082/druid/v2/sql" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT __time AS ts, user_id, session_id, event_type, page, country, SUM(event_count) AS event_count, SUM(revenue) AS revenue FROM events GROUP BY 1,2,3,4,5,6",
    "resultFormat": "csv",
    "header": true
  }' \
  -o /tmp/druid_events.csv
```

For large datasets, export by time range:

```bash
for MONTH in 2024-01 2024-02 2024-03 2024-04; do
  START="${MONTH}-01T00:00:00.000Z"
  END=$(date -d "$MONTH-01 + 1 month" "+%Y-%m-01T00:00:00.000Z")

  curl -X POST "http://druid-broker:8082/druid/v2/sql" \
    -H "Content-Type: application/json" \
    -d "{
      \"query\": \"SELECT __time AS ts, user_id, session_id, event_type, page, country, SUM(event_count) AS event_count, SUM(revenue) AS revenue FROM events WHERE __time >= '${START}' AND __time < '${END}' GROUP BY 1,2,3,4,5,6\",
      \"resultFormat\": \"csv\",
      \"header\": true
    }" \
    -o "/tmp/druid_events_${MONTH}.csv"
done
```

## Step 4: Load into ClickHouse

```bash
for file in /tmp/druid_events_*.csv; do
  clickhouse-client \
    --database analytics \
    --query "INSERT INTO events FORMAT CSVWithNames" \
    < "$file"
done
```

## Step 5: Rewrite Druid SQL Queries

Druid SQL is based on Apache Calcite and differs from standard SQL in several ways:

```sql
-- Druid: __time column access and TIME_FLOOR
SELECT TIME_FLOOR(__time, 'PT1H') AS hour, event_type, COUNT(*) AS events
FROM events
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '7' DAY
GROUP BY 1, 2
ORDER BY 1;

-- ClickHouse
SELECT toStartOfHour(ts) AS hour, event_type, count() AS events
FROM events
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY hour, event_type
ORDER BY hour;
```

```sql
-- Druid: APPROX_COUNT_DISTINCT (uses HLL sketches)
SELECT event_type, APPROX_COUNT_DISTINCT(user_id) AS unique_users
FROM events
GROUP BY event_type;

-- ClickHouse: uniq (adaptive sampling approximation)
SELECT event_type, uniq(user_id) AS unique_users
FROM events
GROUP BY event_type;
```

```sql
-- Druid: APPROX_QUANTILE_DS (uses DataSketches)
SELECT
    event_type,
    APPROX_QUANTILE_DS(duration_ms, 0.99) AS p99
FROM events
GROUP BY event_type;

-- ClickHouse: quantile
SELECT event_type, quantile(0.99)(duration_ms) AS p99
FROM events
GROUP BY event_type;
```

```sql
-- Druid: TIME_IN_INTERVAL filter
SELECT COUNT(*)
FROM events
WHERE TIME_IN_INTERVAL(__time, '2024-01-01/2024-02-01');

-- ClickHouse
SELECT count()
FROM events
WHERE ts >= '2024-01-01' AND ts < '2024-02-01';
```

```sql
-- Druid: MILLIS_TO_TIMESTAMP
SELECT MILLIS_TO_TIMESTAMP(ts_millis) FROM raw_events;

-- ClickHouse: fromUnixTimestamp64Milli
SELECT fromUnixTimestamp64Milli(ts_millis) FROM raw_events;
```

## Step 6: Recreate Druid Rollup with ClickHouse SummingMergeTree

Druid's ingestion-time rollup collapses multiple events with the same dimension values in the same time bucket into one row with summed metrics. ClickHouse's `SummingMergeTree` does the same during background merges:

```sql
-- Raw insert (same as Druid receives from Kafka)
INSERT INTO events VALUES
('2024-01-15 10:00:00', 'user_1', 's1', 'page_view', '/home', 'US', 1, 0.00),
('2024-01-15 10:00:00', 'user_1', 's1', 'page_view', '/home', 'US', 1, 0.00),
('2024-01-15 10:00:00', 'user_2', 's2', 'purchase',  '/cart', 'US', 1, 49.99);

-- After background merge, SummingMergeTree collapses duplicate keys
-- user_1 / page_view / /home / US becomes event_count=2 revenue=0.00

-- Force immediate merge for testing
OPTIMIZE TABLE events FINAL;

SELECT * FROM events;
```

## Step 7: Continuous Ingestion from Kafka

Druid's Kafka indexing service can be replaced with ClickHouse's Kafka table engine:

```sql
CREATE TABLE events_kafka_queue
(
    ts         String,
    user_id    String,
    event_type String,
    page       String,
    amount     Float64
)
ENGINE = Kafka()
SETTINGS
    kafka_broker_list  = 'kafka:9092',
    kafka_topic_list   = 'events',
    kafka_group_name   = 'clickhouse_consumer',
    kafka_format       = 'JSONEachRow';

CREATE MATERIALIZED VIEW events_kafka_mv
TO events_raw
AS
SELECT
    parseDateTime64BestEffort(ts) AS ts,
    user_id,
    event_type,
    page,
    amount
FROM events_kafka_queue;
```

## Summary

Migrating from Druid to ClickHouse simplifies cluster operations while maintaining analytical performance. Map Druid dimensions to `LowCardinality(String)` columns, replace Druid metrics with `SummingMergeTree` for pre-aggregated data or `MergeTree` for raw events, rewrite `TIME_FLOOR` as `toStartOfHour/Day/Month`, and replace `APPROX_COUNT_DISTINCT` with `uniq`. For real-time ingestion, replace Druid's Kafka indexing service with ClickHouse's Kafka table engine and materialized views.
