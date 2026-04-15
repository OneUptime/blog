# How to Build Predictive Maintenance for Utilities with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Predictive Maintenance, Utility, IoT, Sensor, Analytics

Description: Build predictive maintenance analytics for utility assets in ClickHouse by detecting degradation patterns in transformer, pump, and motor telemetry data.

---

Utility infrastructure - transformers, pumps, compressors, and motors - degrades over time. Predictive maintenance analytics uses sensor telemetry to detect degradation before failures occur, reducing outages and maintenance costs.

## Asset Telemetry Table

```sql
CREATE TABLE asset_telemetry (
    asset_id     LowCardinality(String),
    asset_type   LowCardinality(String),  -- transformer, pump, motor, compressor
    site_id      LowCardinality(String),
    sensor_type  LowCardinality(String),  -- temperature, vibration, current, oil_level
    value        Float64,
    unit         LowCardinality(String),
    quality      LowCardinality(String),
    recorded_at  DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (asset_id, sensor_type, recorded_at);
```

## Anomaly Score - Deviation from Baseline

Flag sensors reading outside normal operating range:

```sql
SELECT *
FROM (
    SELECT
        asset_id,
        asset_type,
        sensor_type,
        recorded_at,
        value,
        avg(value) OVER (
            PARTITION BY asset_id, sensor_type
            ORDER BY recorded_at
            ROWS BETWEEN 2016 PRECEDING AND 1 PRECEDING  -- ~7 days at 5-min intervals
        ) AS baseline_avg,
        stddevPop(value) OVER (
            PARTITION BY asset_id, sensor_type
            ORDER BY recorded_at
            ROWS BETWEEN 2016 PRECEDING AND 1 PRECEDING
        ) AS baseline_std,
        abs(value - baseline_avg) / nullIf(baseline_std, 0) AS z_score
    FROM asset_telemetry
    WHERE recorded_at >= now() - INTERVAL 24 HOUR
      AND quality = 'good'
)
WHERE z_score > 3
ORDER BY z_score DESC;
```

## Transformer Thermal Profile

Track transformer loading and temperature for aging estimation:

```sql
SELECT
    asset_id,
    toDate(recorded_at) AS day,
    avgIf(value, sensor_type = 'temperature') AS avg_oil_temp_c,
    maxIf(value, sensor_type = 'temperature') AS max_oil_temp_c,
    avgIf(value, sensor_type = 'current') AS avg_load_amps,
    countIf(sensor_type = 'temperature' AND value > 90) AS overtemp_events
FROM asset_telemetry
WHERE asset_type = 'transformer'
  AND recorded_at >= today() - 30
GROUP BY asset_id, day
ORDER BY max_oil_temp_c DESC;
```

## Vibration Trend - Bearing Wear Detection

Increasing vibration amplitude indicates bearing degradation:

```sql
SELECT
    asset_id,
    toStartOfWeek(recorded_at) AS week,
    avg(value) AS avg_vibration_mm_s,
    max(value) AS max_vibration_mm_s,
    avg(value) - lag(avg(value)) OVER (PARTITION BY asset_id ORDER BY week) AS week_over_week_delta
FROM asset_telemetry
WHERE sensor_type = 'vibration'
  AND recorded_at >= today() - 90
  AND quality = 'good'
GROUP BY asset_id, week
ORDER BY asset_id, week;
```

## Pump Efficiency Degradation

Detect pump efficiency decline from flow and power data:

```sql
SELECT
    asset_id,
    toStartOfMonth(recorded_at) AS month,
    avgIf(value, sensor_type = 'flow_m3h') AS avg_flow,
    avgIf(value, sensor_type = 'power_kw') AS avg_power_kw,
    avgIf(value, sensor_type = 'flow_m3h') / nullIf(avgIf(value, sensor_type = 'power_kw'), 0) AS efficiency_ratio
FROM asset_telemetry
WHERE asset_type = 'pump'
  AND recorded_at >= today() - 365
GROUP BY asset_id, month
ORDER BY asset_id, month;
```

## Maintenance Due Prediction

Assets with sustained anomalies above threshold are candidates for inspection:

```sql
SELECT
    asset_id,
    asset_type,
    sensor_type,
    count() AS anomaly_count_7d,
    max(recorded_at) AS last_anomaly,
    multiIf(
        count() > 50, 'Immediate',
        count() > 20, 'This Week',
        count() > 5,  'This Month',
        'Monitor'
    ) AS recommended_action
FROM (
    SELECT
        asset_id,
        asset_type,
        sensor_type,
        recorded_at,
        value,
        avg(value) OVER (PARTITION BY asset_id, sensor_type) AS sensor_avg,
        stddevPop(value) OVER (PARTITION BY asset_id, sensor_type) AS sensor_std
    FROM asset_telemetry
    WHERE recorded_at >= today() - 7
      AND quality = 'good'
)
WHERE abs(value - sensor_avg) > 3 * sensor_std
GROUP BY asset_id, asset_type, sensor_type
ORDER BY anomaly_count_7d DESC;
```

## Summary

ClickHouse enables predictive maintenance for utility assets by detecting anomalies in sensor telemetry, tracking degradation trends in vibration and temperature, and recommending maintenance priority. Fast window function queries over historical sensor data make it practical to monitor thousands of assets continuously.
