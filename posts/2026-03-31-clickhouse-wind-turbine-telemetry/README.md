# How to Analyze Wind Turbine Telemetry with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Wind Turbine, SCADA, Telemetry, Analytics, Renewable Energy

Description: Analyze wind turbine SCADA telemetry in ClickHouse to track power curves, availability, fault events, and performance degradation across wind farms.

---

Wind turbines generate continuous SCADA data - power output, wind speed, rotor RPM, pitch angles, and fault codes. ClickHouse handles this high-frequency telemetry efficiently for fleet-wide analytics.

## Turbine Telemetry Table

```sql
CREATE TABLE turbine_telemetry (
    farm_id         LowCardinality(String),
    turbine_id      LowCardinality(String),
    wind_speed_ms   Float32,
    power_kw        Float32,
    rotor_rpm       Float32,
    pitch_angle_deg Float32,
    nacelle_temp_c  Float32,
    gearbox_temp_c  Float32,
    status_code     UInt16,
    is_available    UInt8,
    recorded_at     DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (farm_id, turbine_id, recorded_at);
```

## Daily Energy Output Per Turbine

```sql
SELECT
    farm_id,
    turbine_id,
    toDate(recorded_at) AS day,
    sum(power_kw) * 10 / 60000 AS energy_mwh,  -- 10-min intervals
    max(power_kw) AS peak_power_kw,
    avg(wind_speed_ms) AS avg_wind_speed
FROM turbine_telemetry
WHERE recorded_at >= today() - 30
  AND is_available = 1
GROUP BY farm_id, turbine_id, day
ORDER BY farm_id, turbine_id, day;
```

## Power Curve Analysis

Compare actual power output to wind speed:

```sql
SELECT
    turbine_id,
    round(wind_speed_ms) AS wind_bin,
    avg(power_kw) AS avg_power_kw,
    count() AS data_points
FROM turbine_telemetry
WHERE recorded_at >= today() - 90
  AND is_available = 1
  AND wind_speed_ms BETWEEN 3 AND 25
GROUP BY turbine_id, wind_bin
ORDER BY turbine_id, wind_bin;
```

## Turbine Availability

Availability = percentage of time the turbine is operational:

```sql
SELECT
    farm_id,
    turbine_id,
    toStartOfMonth(recorded_at) AS month,
    countIf(is_available = 1) AS available_intervals,
    count() AS total_intervals,
    round(countIf(is_available = 1) / count() * 100, 2) AS availability_pct
FROM turbine_telemetry
WHERE recorded_at >= today() - 365
GROUP BY farm_id, turbine_id, month
ORDER BY farm_id, turbine_id, month;
```

## Fault Event Analysis

Identify common fault codes and their frequency:

```sql
SELECT
    turbine_id,
    status_code,
    count() AS occurrences,
    sum(count()) OVER (PARTITION BY turbine_id) AS total_faults,
    round(count() / sum(count()) OVER (PARTITION BY turbine_id) * 100, 2) AS fault_share_pct
FROM turbine_telemetry
WHERE status_code != 0
  AND recorded_at >= today() - 30
GROUP BY turbine_id, status_code
ORDER BY turbine_id, occurrences DESC;
```

## Gearbox Temperature Trend

Detect early signs of gearbox overheating:

```sql
SELECT
    turbine_id,
    toStartOfHour(recorded_at) AS hour,
    avg(gearbox_temp_c) AS avg_gearbox_temp,
    max(gearbox_temp_c) AS max_gearbox_temp,
    countIf(gearbox_temp_c > 80) AS overtemp_events
FROM turbine_telemetry
WHERE recorded_at >= today() - 7
GROUP BY turbine_id, hour
HAVING max_gearbox_temp > 75
ORDER BY max_gearbox_temp DESC;
```

## Summary

ClickHouse handles wind turbine SCADA telemetry at scale - power curve analysis, availability calculations, fault tracking, and thermal monitoring are all practical with fast columnar aggregations. Fleet-wide analytics across hundreds of turbines runs efficiently with proper time-series partitioning.
