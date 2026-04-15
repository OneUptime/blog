# How to Build Water Usage Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Water, Utility, Analytics, Leak Detection, Conservation

Description: Build water usage analytics in ClickHouse to track consumption patterns, detect leaks, benchmark districts, and support conservation programs.

---

Water utilities need analytics to detect leaks, benchmark district metered areas, and identify high consumers for conservation outreach. ClickHouse stores high-frequency meter data and enables fast aggregations across large service territories.

## Water Meter Readings Table

```sql
CREATE TABLE water_readings (
    meter_id      LowCardinality(String),
    customer_id   UInt64,
    district      LowCardinality(String),
    zone          LowCardinality(String),
    use_type      LowCardinality(String),  -- residential, commercial, industrial, irrigation
    reading_m3    Float64,  -- cumulative cubic meters
    flow_lpm      Float32,  -- liters per minute
    pressure_bar  Float32,
    reading_at    DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(reading_at)
ORDER BY (meter_id, reading_at);
```

## Daily Consumption Per Meter

```sql
SELECT
    meter_id,
    customer_id,
    toDate(reading_at) AS day,
    max(reading_m3) - min(reading_m3) AS daily_consumption_m3
FROM water_readings
WHERE reading_at >= today() - 30
GROUP BY meter_id, customer_id, day
HAVING daily_consumption_m3 > 0
ORDER BY daily_consumption_m3 DESC;
```

## Leak Detection - Night Flow Analysis

Water flow between midnight and 4am indicates potential leaks:

```sql
SELECT
    meter_id,
    customer_id,
    district,
    avg(flow_lpm) AS avg_night_flow_lpm,
    countIf(flow_lpm > 2) AS high_flow_readings
FROM water_readings
WHERE toHour(reading_at) BETWEEN 0 AND 3
  AND reading_at >= today() - 14
GROUP BY meter_id, customer_id, district
HAVING avg_night_flow_lpm > 2
ORDER BY avg_night_flow_lpm DESC;
```

## District Metered Area (DMA) Balance

Compare production vs. metered consumption to find non-revenue water:

```sql
SELECT
    district,
    toDate(reading_at) AS day,
    sumIf(flow_lpm * 60, use_type = 'production') AS production_m3,
    sumIf(flow_lpm * 60, use_type != 'production') AS metered_consumption_m3,
    production_m3 - metered_consumption_m3 AS apparent_loss_m3,
    round((production_m3 - metered_consumption_m3) / nullIf(production_m3, 0) * 100, 2) AS loss_pct
FROM water_readings
WHERE reading_at >= today() - 30
GROUP BY district, day
ORDER BY loss_pct DESC;
```

## High Consumer Identification

Flag top consumers for conservation outreach:

```sql
SELECT
    customer_id,
    district,
    use_type,
    max(reading_m3) - min(reading_m3) AS total_m3_30d
FROM water_readings
WHERE reading_at >= today() - 30
GROUP BY customer_id, district, use_type
ORDER BY total_m3_30d DESC
LIMIT 100;
```

## Pressure Zone Monitoring

Detect low-pressure events that indicate main breaks:

```sql
SELECT
    zone,
    toStartOfHour(reading_at) AS hour,
    avg(pressure_bar) AS avg_pressure,
    min(pressure_bar) AS min_pressure,
    countIf(pressure_bar < 2.0) AS low_pressure_events
FROM water_readings
WHERE reading_at >= today() - 7
GROUP BY zone, hour
HAVING low_pressure_events > 0
ORDER BY low_pressure_events DESC;
```

## Summary

ClickHouse enables water utilities to detect leaks through night flow analysis, balance district metered areas to find non-revenue water, and identify high consumers for conservation programs. Fast aggregations across millions of meter readings make it practical to run these analyses across entire service territories in real time.
