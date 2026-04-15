# How to Track Power Grid Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Power Grid, Monitoring, Time Series, Analytics, Infrastructure

Description: Learn how to store and query power grid metrics such as frequency, voltage, and load in ClickHouse for real-time grid monitoring.

---

## Why Power Grid Monitoring Needs Fast Storage

Transmission system operators collect hundreds of metrics per second from substations, transformers, and generation units. Detecting frequency excursions or voltage sags before they cascade into outages requires sub-second query latency over recent data and efficient storage for historical trend analysis.

## Table Design

```sql
CREATE TABLE grid_metrics
(
    node_id      UInt32,
    node_type    LowCardinality(String),
    recorded_at  DateTime64(3),
    frequency_hz Float32,
    voltage_kv   Float32,
    load_mw      Float32,
    reactive_mvar Float32,
    status       UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (node_id, recorded_at)
TTL toDate(recorded_at) + INTERVAL 2 YEAR;
```

Using `DateTime64(3)` provides millisecond precision needed for transient event correlation.

## Real-Time Frequency Excursion Detection

Grid frequency must stay within a tight band (for example, 49.8-50.2 Hz in Europe):

```sql
SELECT
    node_id,
    recorded_at,
    frequency_hz
FROM grid_metrics
WHERE recorded_at >= now() - INTERVAL 5 MINUTE
  AND (frequency_hz < 49.8 OR frequency_hz > 50.2)
ORDER BY recorded_at DESC
LIMIT 100;
```

## Load Flow Analysis Over a 24-Hour Window

```sql
SELECT
    node_id,
    toStartOfFifteenMinutes(recorded_at) AS interval_start,
    avg(load_mw)                          AS avg_load_mw,
    max(load_mw)                          AS peak_load_mw,
    min(voltage_kv)                       AS min_voltage_kv
FROM grid_metrics
WHERE recorded_at >= today()
GROUP BY node_id, interval_start
ORDER BY node_id, interval_start;
```

## Voltage Sag Event Identification

```sql
WITH baseline AS (
    SELECT node_id, avg(voltage_kv) AS base_voltage
    FROM grid_metrics
    WHERE recorded_at BETWEEN today() - 7 AND today()
    GROUP BY node_id
)
SELECT
    g.node_id,
    g.recorded_at,
    g.voltage_kv,
    b.base_voltage,
    round((b.base_voltage - g.voltage_kv) / b.base_voltage * 100, 2) AS sag_pct
FROM grid_metrics g
JOIN baseline b ON g.node_id = b.node_id
WHERE g.recorded_at >= now() - INTERVAL 1 HOUR
  AND g.voltage_kv < b.base_voltage * 0.90
ORDER BY sag_pct DESC;
```

## Node Availability Summary

```sql
SELECT
    node_id,
    countIf(status = 1)                           AS online_intervals,
    count()                                       AS total_intervals,
    round(countIf(status = 1) * 100.0 / count(), 2) AS availability_pct
FROM grid_metrics
WHERE recorded_at >= today() - INTERVAL 30 DAY
GROUP BY node_id
ORDER BY availability_pct ASC
LIMIT 20;
```

## Materialized View for Hourly Grid Summary

```sql
CREATE TABLE grid_hourly_summary
(
    node_id        UInt32,
    hour           DateTime,
    avg_freq_hz    AggregateFunction(avg, Float32),
    avg_load_mw    AggregateFunction(avg, Float32),
    min_voltage_kv AggregateFunction(min, Float32)
)
ENGINE = AggregatingMergeTree()
ORDER BY (node_id, hour);

CREATE MATERIALIZED VIEW grid_hourly_mv TO grid_hourly_summary AS
SELECT
    node_id,
    toStartOfHour(recorded_at)   AS hour,
    avgState(frequency_hz)        AS avg_freq_hz,
    avgState(load_mw)             AS avg_load_mw,
    minState(voltage_kv)          AS min_voltage_kv
FROM grid_metrics
GROUP BY node_id, hour;
```

## Summary

ClickHouse gives grid operators a high-throughput time-series store with the SQL expressiveness to detect anomalies, compute availability, and run load flow analytics. Millisecond-precision timestamps and fast aggregations make it a strong fit for both real-time alerting and historical grid analysis.
