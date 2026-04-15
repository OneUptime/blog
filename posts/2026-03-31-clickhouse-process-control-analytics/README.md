# How to Build Process Control Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Process Control, Manufacturing, SPC, PLC, Analytics

Description: Build process control analytics in ClickHouse to monitor PLC setpoints, track process variable deviations, and implement statistical process control for manufacturing.

---

Process control analytics monitors the variables that drive product quality - temperature, pressure, flow rate, and pH - ensuring they stay within specification. ClickHouse stores high-frequency PLC data and enables SPC analytics at scale.

## Process Variable Table

```sql
CREATE TABLE process_variables (
    plant_id     LowCardinality(String),
    unit_id      LowCardinality(String),
    tag_name     LowCardinality(String),
    description  String,
    value        Float64,
    setpoint     Nullable(Float64),
    high_limit   Float64,
    low_limit    Float64,
    engineering_unit LowCardinality(String),
    quality      LowCardinality(String),
    recorded_at  DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (plant_id, unit_id, tag_name, recorded_at);
```

## Process Variable Summary

Track how often each variable stays within limits:

```sql
SELECT
    unit_id,
    tag_name,
    engineering_unit,
    avg(value) AS avg_value,
    min(value) AS min_value,
    max(value) AS max_value,
    stddevPop(value) AS std_value,
    countIf(value > high_limit OR value < low_limit) AS out_of_limit_count,
    count() AS total_readings,
    round(countIf(value BETWEEN low_limit AND high_limit) / count() * 100, 2) AS within_limits_pct
FROM process_variables
WHERE recorded_at >= today() - 7
  AND quality = 'good'
GROUP BY unit_id, tag_name, engineering_unit
ORDER BY within_limits_pct;
```

## Setpoint Deviation Analysis

Measure how tightly the control loop tracks setpoints:

```sql
SELECT
    unit_id,
    tag_name,
    avg(abs(value - setpoint)) AS avg_absolute_deviation,
    max(abs(value - setpoint)) AS max_deviation,
    round(avg(abs(value - setpoint)) / nullIf(avg(abs(setpoint)), 0) * 100, 3) AS deviation_pct
FROM process_variables
WHERE setpoint IS NOT NULL
  AND recorded_at >= today() - 7
  AND quality = 'good'
GROUP BY unit_id, tag_name
ORDER BY avg_absolute_deviation DESC;
```

## Alarm Frequency by Tag

Identify high-alarm tags for operator investigation:

```sql
SELECT
    unit_id,
    tag_name,
    countIf(value > high_limit) AS high_alarms,
    countIf(value < low_limit) AS low_alarms,
    countIf(value > high_limit) + countIf(value < low_limit) AS total_alarms,
    count() AS total_readings,
    round((countIf(value > high_limit) + countIf(value < low_limit)) / count() * 100, 2) AS alarm_rate_pct
FROM process_variables
WHERE recorded_at >= today() - 7
GROUP BY unit_id, tag_name
HAVING total_alarms > 10
ORDER BY total_alarms DESC;
```

## Process Correlation Analysis

Check if two process variables are correlated - useful for root cause:

```sql
SELECT
    corr(avg_temp, avg_viscosity) AS temp_viscosity_correlation
FROM (
    SELECT
        toStartOfHour(recorded_at) AS hour,
        avgIf(value, tag_name = 'reactor_temp') AS avg_temp,
        avgIf(value, tag_name = 'product_viscosity') AS avg_viscosity
    FROM process_variables
    WHERE unit_id = 'REACTOR_1'
      AND recorded_at >= today() - 30
      AND tag_name IN ('reactor_temp', 'product_viscosity')
    GROUP BY hour
)
```

## Golden Batch Analysis

Find operating conditions that produced the best product quality:

```sql
SELECT
    toDate(recorded_at) AS batch_date,
    avgIf(value, tag_name = 'reactor_temp') AS avg_temp,
    avgIf(value, tag_name = 'reactor_pressure') AS avg_pressure,
    avgIf(value, tag_name = 'feed_rate') AS avg_feed_rate,
    avgIf(value, tag_name = 'product_yield') AS avg_yield
FROM process_variables
WHERE recorded_at >= today() - 90
GROUP BY batch_date
ORDER BY avg_yield DESC
LIMIT 20;
```

## Summary

ClickHouse supports process control analytics by storing high-frequency PLC data and enabling SPC calculations, setpoint deviation analysis, and alarm frequency tracking. These insights help process engineers identify control loop issues, reduce variability, and maintain product quality consistently.
