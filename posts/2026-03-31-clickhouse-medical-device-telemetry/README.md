# How to Track Medical Device Telemetry in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Healthcare, Medical Device, IoT, Telemetry

Description: Ingest and analyze medical device telemetry in ClickHouse to monitor device health, detect anomalies, and support post-market surveillance.

---

Connected medical devices - infusion pumps, ventilators, patient monitors - stream telemetry continuously. This data is essential for post-market surveillance, predictive maintenance, and clinical decision support. ClickHouse handles the high-frequency ingestion and provides fast query access for clinical and engineering teams.

## Device Telemetry Table

```sql
CREATE TABLE device_telemetry (
    telemetry_id    UUID,
    device_id       UInt64,
    device_type     LowCardinality(String),   -- 'ventilator', 'pump', 'monitor'
    firmware_ver    LowCardinality(String),
    facility_id     UInt32,
    ward            LowCardinality(String),
    recorded_at     DateTime64(3),
    metric_name     LowCardinality(String),
    metric_value    Nullable(Float64),
    unit            LowCardinality(String),
    is_alarm        UInt8,
    alarm_type      LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY (device_type, device_id, recorded_at)
PARTITION BY toYYYYMM(recorded_at)
TTL recorded_at + INTERVAL 5 YEAR;
```

## Recent Alarm Summary

```sql
SELECT
    device_id,
    device_type,
    alarm_type,
    count()             AS alarm_count,
    max(recorded_at)    AS last_alarm
FROM device_telemetry
WHERE is_alarm = 1
  AND recorded_at >= now() - INTERVAL 24 HOUR
GROUP BY device_id, device_type, alarm_type
ORDER BY alarm_count DESC
LIMIT 30;
```

## Out-of-Range Metric Detection

```sql
SELECT
    device_id,
    device_type,
    metric_name,
    round(avg(metric_value), 3)   AS avg_value,
    round(min(metric_value), 3)   AS min_value,
    round(max(metric_value), 3)   AS max_value,
    count()                       AS readings
FROM device_telemetry
WHERE recorded_at >= now() - INTERVAL 1 HOUR
  AND metric_name = 'tidal_volume_ml'
  AND (metric_value < 300 OR metric_value > 700)   -- clinical safe range
GROUP BY device_id, device_type, metric_name
ORDER BY max_value DESC;
```

## Device Uptime Analysis

```sql
SELECT
    device_id,
    count()                          AS total_readings,
    countIf(metric_value IS NOT NULL) AS valid_readings,
    round(100.0 * countIf(metric_value IS NOT NULL) / count(), 2) AS uptime_pct
FROM device_telemetry
WHERE recorded_at >= today() - 30
GROUP BY device_id
ORDER BY uptime_pct ASC
LIMIT 20;
```

## Firmware Version Distribution

```sql
SELECT
    device_type,
    firmware_ver,
    count(DISTINCT device_id) AS device_count
FROM device_telemetry
WHERE recorded_at >= now() - INTERVAL 1 HOUR
GROUP BY device_type, firmware_ver
ORDER BY device_type, device_count DESC;
```

## Predictive Maintenance Signals

Detect devices whose alarm rate has increased compared to their 7-day average.

```sql
SELECT
    device_id,
    device_type,
    countIf(recorded_at >= today())                AS alarms_today,
    round(countIf(recorded_at >= today() - 7) / 7, 1) AS avg_alarms_per_day_7d
FROM device_telemetry
WHERE is_alarm = 1
  AND recorded_at >= today() - 7
GROUP BY device_id, device_type
HAVING alarms_today > avg_alarms_per_day_7d * 3
ORDER BY alarms_today DESC;
```

## Facility-Level Alarm Heatmap

```sql
SELECT
    facility_id,
    ward,
    toHour(recorded_at) AS hour,
    count()             AS alarms
FROM device_telemetry
WHERE is_alarm = 1
  AND recorded_at >= today() - 7
GROUP BY facility_id, ward, hour
ORDER BY facility_id, ward, hour;
```

## Summary

ClickHouse provides the ingestion throughput and query speed needed for medical device telemetry at scale. TTL-based retention satisfies post-market surveillance data requirements, while fast aggregations over alarm events, metric ranges, and firmware distributions give biomedical engineering and clinical teams the visibility they need to keep devices operating safely.
