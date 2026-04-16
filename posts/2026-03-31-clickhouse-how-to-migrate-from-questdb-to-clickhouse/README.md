# How to Migrate from QuestDB to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, QuestDB, Migration, Time Series, Analytics, Database

Description: Migrate from QuestDB to ClickHouse when you need richer SQL support, horizontal scaling, or a larger ecosystem of integrations for time-series analytics.

---

QuestDB is a fast time-series database with a PostgreSQL-compatible wire protocol. ClickHouse offers similar time-series performance while adding richer SQL features, better ecosystem support, and more flexible scaling options.

## Reasons to Migrate

- Need for full SQL window functions and complex subqueries
- Horizontal sharding across multiple nodes
- Richer ecosystem (Grafana, Superset, dbt, etc.)
- Better compression and storage management for long-term retention

## Step 1 - Export Data from QuestDB

Use QuestDB's REST API to export to CSV:

```bash
curl -G "http://localhost:9000/exp" \
  --data-urlencode "query=SELECT * FROM sensor_readings WHERE ts >= '2024-01-01'" \
  > sensor_readings.csv
```

For large tables, page through results:

```bash
PAGE=100000
OFFSET=0
while true; do
  UPPER=$((OFFSET + PAGE))
  curl -s -G "http://localhost:9000/exp" \
    --data-urlencode "query=SELECT * FROM sensor_readings LIMIT ${OFFSET}, ${UPPER}" \
    -o "chunk_${OFFSET}.csv"
  [ "$(wc -l < chunk_${OFFSET}.csv)" -lt "$PAGE" ] && break
  OFFSET=$UPPER
done
```

## Step 2 - Create the ClickHouse Table

Map QuestDB's designated timestamp to ClickHouse's DateTime:

```sql
-- QuestDB schema
-- CREATE TABLE sensor_readings (
--     ts          TIMESTAMP,
--     sensor_id   SYMBOL,
--     location    SYMBOL,
--     temperature DOUBLE,
--     humidity    DOUBLE
-- ) TIMESTAMP(ts) PARTITION BY DAY;

-- ClickHouse equivalent
CREATE TABLE metrics.sensor_readings
(
    ts          DateTime64(6),
    sensor_id   LowCardinality(String),
    location    LowCardinality(String),
    temperature Float64,
    humidity    Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (ts, sensor_id);
```

## Step 3 - Load the Exported Data

```bash
clickhouse-client \
  --query "INSERT INTO metrics.sensor_readings FORMAT CSVWithNames" \
  < sensor_readings.csv
```

## Step 4 - Translate QuestDB SQL to ClickHouse SQL

QuestDB has custom time-series functions:

```sql
-- QuestDB: SAMPLE BY for time bucketing
SELECT ts, avg(temperature), avg(humidity)
FROM sensor_readings
WHERE ts >= dateadd('d', -7, now())
SAMPLE BY 1h

-- ClickHouse equivalent
SELECT
    toStartOfHour(ts) AS hour,
    avg(temperature),
    avg(humidity)
FROM metrics.sensor_readings
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY hour
ORDER BY hour
```

```sql
-- QuestDB: LATEST ON for last known value per symbol
SELECT * FROM sensor_readings
LATEST ON ts PARTITION BY sensor_id

-- ClickHouse: using LIMIT BY
SELECT *
FROM metrics.sensor_readings
ORDER BY sensor_id, ts DESC
LIMIT 1 BY sensor_id
```

## Step 5 - Set Up Ongoing Ingestion

QuestDB supports InfluxDB Line Protocol. Route new metrics to ClickHouse via Vector:

```text
[sources.influx]
type = "socket"
address = "0.0.0.0:9009"
mode = "tcp"
framing.method = "newline_delimited"

[sinks.clickhouse]
type = "clickhouse"
inputs = ["influx"]
endpoint = "http://localhost:8123"
database = "metrics"
table = "sensor_readings"
```

## Summary

Migrating from QuestDB to ClickHouse is primarily a matter of translating QuestDB's `SAMPLE BY` and `LATEST ON` syntax to ClickHouse's `toStartOfHour()`/`GROUP BY` and `LIMIT BY` equivalents. Data export via the REST API and CSV import into ClickHouse is straightforward for most dataset sizes.
