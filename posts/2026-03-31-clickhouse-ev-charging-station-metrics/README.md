# How to Track EV Charging Station Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Analytics, Time-Series, Electric Vehicle, IoT

Description: Learn how to design a ClickHouse schema to ingest, store, and query EV charging station telemetry including energy delivered, session duration, and fault events.

## Introduction

Electric vehicle charging networks generate continuous streams of telemetry. Every charging session produces data about energy consumption, connector state, power delivery, and user behavior. When you operate thousands of stations across a region, that telemetry can easily exceed tens of millions of rows per day. ClickHouse is an ideal fit for this workload because it excels at fast aggregations over large time-series datasets.

This guide walks through schema design, data ingestion, and the queries you need to monitor station health, utilization, and revenue in real time.

## Schema Design

The core table stores one row per measurement interval. Stations typically report telemetry every 15 to 30 seconds during an active session.

```sql
CREATE TABLE ev_charging_metrics
(
    station_id       LowCardinality(String),
    connector_id     UInt8,
    recorded_at      DateTime,
    session_id       String,
    state            LowCardinality(String),  -- Available, Charging, Faulted, Offline
    power_kw         Float32,
    energy_kwh       Float32,
    voltage_v        Float32,
    current_a        Float32,
    soc_percent      Nullable(Float32),       -- state of charge if vehicle reports it
    temperature_c    Float32,
    error_code       LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (station_id, connector_id, recorded_at);
```

A separate table captures session-level summaries, written once when a session completes:

```sql
CREATE TABLE ev_charging_sessions
(
    session_id       String,
    station_id       LowCardinality(String),
    connector_id     UInt8,
    started_at       DateTime,
    ended_at         DateTime,
    energy_kwh       Float32,
    peak_power_kw    Float32,
    revenue_usd      Decimal(10, 2),
    driver_id        String,
    vehicle_model    LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(started_at)
ORDER BY (station_id, started_at);
```

A fault events table captures discrete alerts so they can be queried independently without scanning raw telemetry:

```sql
CREATE TABLE ev_charging_faults
(
    fault_id         UUID DEFAULT generateUUIDv4(),
    station_id       LowCardinality(String),
    connector_id     UInt8,
    occurred_at      DateTime,
    resolved_at      Nullable(DateTime),
    error_code       LowCardinality(String),
    severity         LowCardinality(String),  -- Warning, Error, Critical
    description      String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (station_id, occurred_at);
```

## Inserting Telemetry

In production, a message broker like Kafka feeds telemetry into ClickHouse using the Kafka table engine or a connector. For testing, use direct inserts:

```sql
INSERT INTO ev_charging_metrics VALUES
('STATION-001', 1, now(), 'sess-abc123', 'Charging', 7.4, 12.5, 240.1, 30.8, 65.0, 28.3, ''),
('STATION-001', 2, now(), '',           'Available', 0.0,  0.0, 240.0,  0.0, NULL, 27.9, ''),
('STATION-002', 1, now(), 'sess-def456', 'Charging', 50.0, 8.3, 400.2, 125.1, 40.0, 35.1, ''),
('STATION-002', 2, now(), '',           'Faulted',   0.0,  0.0, 0.0,   0.0, NULL, 29.0, 'E0021');
```

## Querying Station Utilization

Utilization is the fraction of time a connector spends in the Charging state. The following query computes hourly utilization for each station over the past 7 days:

```sql
SELECT
    station_id,
    toStartOfHour(recorded_at) AS hour,
    countIf(state = 'Charging') / count() AS utilization_ratio
FROM ev_charging_metrics
WHERE recorded_at >= now() - INTERVAL 7 DAY
GROUP BY station_id, hour
ORDER BY station_id, hour;
```

## Daily Energy Delivered Per Station

```sql
SELECT
    station_id,
    toDate(recorded_at) AS day,
    max(energy_kwh) - min(energy_kwh) AS energy_delivered_kwh
FROM ev_charging_metrics
WHERE recorded_at >= now() - INTERVAL 30 DAY
  AND state = 'Charging'
GROUP BY station_id, day
ORDER BY day DESC, energy_delivered_kwh DESC;
```

## Average Session Duration and Revenue

```sql
SELECT
    station_id,
    count()                                          AS total_sessions,
    avg(dateDiff('minute', started_at, ended_at))    AS avg_duration_min,
    sum(energy_kwh)                                  AS total_kwh,
    sum(revenue_usd)                                 AS total_revenue_usd
FROM ev_charging_sessions
WHERE started_at >= toStartOfMonth(now())
GROUP BY station_id
ORDER BY total_revenue_usd DESC;
```

## Fault Rate by Station

A high fault rate indicates hardware problems or grid instability. Track it over rolling 24-hour windows:

```sql
SELECT
    station_id,
    count()                                              AS fault_count,
    countIf(severity = 'Critical')                       AS critical_faults,
    countIf(resolved_at IS NOT NULL) / count()           AS resolution_ratio
FROM ev_charging_faults
WHERE occurred_at >= now() - INTERVAL 24 HOUR
GROUP BY station_id
ORDER BY fault_count DESC
LIMIT 20;
```

## Power Delivery Over Time

For a single station, plot power draw across all connectors to spot load balancing issues:

```sql
SELECT
    toStartOfFiveMinute(recorded_at) AS bucket,
    connector_id,
    avg(power_kw)                     AS avg_power_kw,
    max(power_kw)                     AS peak_power_kw
FROM ev_charging_metrics
WHERE station_id = 'STATION-002'
  AND recorded_at >= now() - INTERVAL 24 HOUR
GROUP BY bucket, connector_id
ORDER BY bucket, connector_id;
```

## Materialized View for Real-Time Station Status

A materialized view that aggregates the latest state per connector enables a live dashboard without expensive point-in-time queries:

```sql
CREATE MATERIALIZED VIEW ev_station_status_mv
ENGINE = AggregatingMergeTree()
ORDER BY (station_id, connector_id)
AS
SELECT
    station_id,
    connector_id,
    argMaxState(state, recorded_at)        AS latest_state,
    argMaxState(power_kw, recorded_at)     AS latest_power_kw,
    argMaxState(energy_kwh, recorded_at)   AS latest_energy_kwh,
    maxState(recorded_at)                  AS last_seen
FROM ev_charging_metrics
GROUP BY station_id, connector_id;
```

Query the view using the `-Merge` combinator functions:

```sql
SELECT
    station_id,
    connector_id,
    argMaxMerge(latest_state)      AS state,
    argMaxMerge(latest_power_kw)   AS power_kw,
    maxMerge(last_seen)            AS last_seen
FROM ev_station_status_mv
GROUP BY station_id, connector_id
ORDER BY station_id, connector_id;
```

## Identifying Underperforming Stations

Compare each station's average session energy against the fleet median to flag outliers:

```sql
WITH fleet_median AS (
    SELECT median(energy_kwh) AS med_kwh
    FROM ev_charging_sessions
    WHERE started_at >= now() - INTERVAL 30 DAY
)
SELECT
    s.station_id,
    avg(s.energy_kwh)           AS avg_kwh,
    f.med_kwh,
    avg(s.energy_kwh) / f.med_kwh AS ratio
FROM ev_charging_sessions AS s
CROSS JOIN fleet_median AS f
WHERE s.started_at >= now() - INTERVAL 30 DAY
GROUP BY s.station_id, f.med_kwh
HAVING ratio < 0.5
ORDER BY ratio;
```

## TTL for Raw Telemetry

Raw per-second telemetry is only useful for short-term debugging. Set a TTL to automatically drop it after 90 days while keeping session summaries forever:

```sql
ALTER TABLE ev_charging_metrics
    MODIFY TTL recorded_at + INTERVAL 90 DAY;
```

## Conclusion

ClickHouse handles EV charging telemetry well because the workload is append-only, time-ordered, and query-heavy on aggregations. The combination of MergeTree partitioning, sparse primary indexes, and materialized views gives you sub-second dashboard queries even as the dataset grows into the billions of rows. With TTL policies, you can manage storage costs automatically without manual data cleanup.

**Related Reading:**

- [How to Detect Anomalies in Time-Series Data with ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-anomaly-detection-time-series/view)
- [What Is TTL in ClickHouse and How Data Lifecycle Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ttl-data-lifecycle/view)
- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
