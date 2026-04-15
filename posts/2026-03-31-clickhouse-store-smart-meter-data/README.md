# How to Store Smart Meter Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Smart Meter, Time Series, IoT, Energy, Analytics

Description: Learn how to design a ClickHouse schema to ingest and query billions of smart meter readings efficiently using the MergeTree family.

---

## Why ClickHouse for Smart Meter Data

Smart meters generate continuous streams of readings - voltage, current, active power, and energy consumption - at intervals as short as 15 minutes per device. A utility with one million meters collects roughly 35 billion rows per year. ClickHouse's columnar storage and MergeTree engine handle this volume while keeping query latency in the milliseconds.

## Schema Design

Use a `MergeTree` partitioned by month and sorted by meter ID plus timestamp to enable fast range scans.

```sql
CREATE TABLE smart_meter_readings
(
    meter_id        UInt64,
    recorded_at     DateTime,
    voltage_v       Float32,
    current_a       Float32,
    active_power_kw Float32,
    energy_kwh      Float64,
    quality_flag    UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (meter_id, recorded_at)
TTL recorded_at + INTERVAL 3 YEAR;
```

## Bulk Ingestion via HTTP

Send batches from a collector using the HTTP interface:

```bash
cat readings.ndjson | curl -s \
  -X POST "http://clickhouse:8123/?query=INSERT+INTO+smart_meter_readings+FORMAT+JSONEachRow" \
  --data-binary @-
```

For Kafka-based pipelines, the ClickHouse Kafka engine consumes topics directly:

```sql
CREATE TABLE smart_meter_kafka_queue
(
    meter_id        UInt64,
    recorded_at     DateTime,
    active_power_kw Float32,
    energy_kwh      Float64
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list  = 'smart_meters',
    kafka_group_name  = 'ch_consumer',
    kafka_format      = 'JSONEachRow';

CREATE MATERIALIZED VIEW smart_meter_mv TO smart_meter_readings AS
SELECT * FROM smart_meter_kafka_queue;
```

## Common Queries

**Hourly consumption for a single meter:**

```sql
SELECT
    toStartOfHour(recorded_at) AS hour,
    max(energy_kwh) - min(energy_kwh) AS kwh_consumed
FROM smart_meter_readings
WHERE meter_id = 100042
  AND recorded_at >= now() - INTERVAL 7 DAY
GROUP BY hour
ORDER BY hour;
```

**Top 10 highest-demand meters in the last hour:**

```sql
SELECT
    meter_id,
    avg(active_power_kw) AS avg_kw
FROM smart_meter_readings
WHERE recorded_at >= now() - INTERVAL 1 HOUR
GROUP BY meter_id
ORDER BY avg_kw DESC
LIMIT 10;
```

**Daily energy totals across all meters:**

```sql
SELECT
    toDate(recorded_at)                          AS day,
    sum(active_power_kw) * 0.25                   AS estimated_kwh
FROM smart_meter_readings
WHERE recorded_at >= today() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day;
```

## Materialized View for Pre-aggregated Hourly Data

Pre-aggregate readings so dashboards never scan raw rows:

```sql
CREATE TABLE smart_meter_hourly
(
    meter_id    UInt64,
    hour        DateTime,
    avg_kw      AggregateFunction(avg, Float32),
    max_kw      AggregateFunction(max, Float32),
    max_kwh     AggregateFunction(max, Float64),
    min_kwh     AggregateFunction(min, Float64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (meter_id, hour);

CREATE MATERIALIZED VIEW smart_meter_hourly_mv TO smart_meter_hourly AS
SELECT
    meter_id,
    toStartOfHour(recorded_at) AS hour,
    avgState(active_power_kw)   AS avg_kw,
    maxState(active_power_kw)   AS max_kw,
    maxState(energy_kwh)        AS max_kwh,
    minState(energy_kwh)        AS min_kwh
FROM smart_meter_readings
GROUP BY meter_id, hour;
```

## Summary

ClickHouse is an excellent fit for smart meter data. A partitioned MergeTree table handles billions of rows with low storage overhead, while materialized views pre-compute hourly aggregates for dashboard queries. Combine this with a Kafka consumer table for real-time ingestion and TTL-based expiry to automate data retention.
