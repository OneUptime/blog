# How to Build Predictive Maintenance Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Predictive Maintenance, Manufacturing, IoT, Sensor, Failure Prediction

Description: Build predictive maintenance analytics for manufacturing equipment in ClickHouse by detecting anomalies in vibration, temperature, and current signals.

---

Predictive maintenance in manufacturing uses sensor telemetry to detect equipment degradation before failures occur, reducing unplanned downtime and maintenance costs. ClickHouse handles the high-frequency sensor data required for this analysis.

## Equipment Sensor Table

```sql
CREATE TABLE equipment_sensors (
    equipment_id LowCardinality(String),
    equipment_type LowCardinality(String),  -- motor, pump, compressor, conveyor
    plant_id     LowCardinality(String),
    sensor_tag   LowCardinality(String),
    value        Float64,
    recorded_at  DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (equipment_id, sensor_tag, recorded_at);
```

## Rolling Statistics for Anomaly Detection

Compute rolling mean and standard deviation to flag outliers:

```sql
SELECT *
FROM (
    SELECT
        equipment_id,
        sensor_tag,
        recorded_at,
        value,
        avg(value) OVER (
            PARTITION BY equipment_id, sensor_tag
            ORDER BY recorded_at
            ROWS BETWEEN 287 PRECEDING AND CURRENT ROW  -- 24h at 5-min intervals
        ) AS rolling_24h_mean,
        stddevPop(value) OVER (
            PARTITION BY equipment_id, sensor_tag
            ORDER BY recorded_at
            ROWS BETWEEN 287 PRECEDING AND CURRENT ROW
        ) AS rolling_24h_std,
        abs(value - rolling_24h_mean) / nullIf(rolling_24h_std, 0) AS z_score
    FROM equipment_sensors
    WHERE recorded_at >= now() - INTERVAL 2 HOUR
)
WHERE z_score > 3
ORDER BY z_score DESC;
```

## Failure Event Correlation

Join sensor anomalies with maintenance work orders to find predictive signals:

```sql
CREATE TABLE work_orders (
    wo_id         String,
    equipment_id  LowCardinality(String),
    failure_type  LowCardinality(String),
    opened_at     DateTime,
    resolved_at   Nullable(DateTime)
) ENGINE = MergeTree()
ORDER BY (equipment_id, opened_at);
```

```sql
SELECT
    wo.equipment_id,
    wo.failure_type,
    wo.opened_at,
    avgIf(es.value, es.sensor_tag = 'vibration' AND es.recorded_at BETWEEN wo.opened_at - INTERVAL 7 DAY AND wo.opened_at) AS avg_vibration_pre_failure,
    avgIf(es.value, es.sensor_tag = 'temperature' AND es.recorded_at BETWEEN wo.opened_at - INTERVAL 7 DAY AND wo.opened_at) AS avg_temp_pre_failure
FROM work_orders wo
JOIN equipment_sensors es ON wo.equipment_id = es.equipment_id
WHERE wo.opened_at >= today() - 180
GROUP BY wo.equipment_id, wo.failure_type, wo.opened_at
ORDER BY wo.opened_at DESC;
```

## Health Score Per Equipment

Combine multiple sensor signals into a composite health score:

```sql
SELECT
    equipment_id,
    equipment_type,
    plant_id,
    avgIf(value, sensor_tag = 'vibration') AS avg_vibration,
    avgIf(value, sensor_tag = 'temperature') AS avg_temperature,
    avgIf(value, sensor_tag = 'current_amps') AS avg_current,
    -- simple weighted health score
    100 - least(
        greatest(avgIf(value, sensor_tag = 'vibration') / 10 * 30, 0) +
        greatest((avgIf(value, sensor_tag = 'temperature') - 60) / 40 * 40, 0) +
        greatest((avgIf(value, sensor_tag = 'current_amps') - 100) / 50 * 30, 0),
        100
    ) AS health_score
FROM equipment_sensors
WHERE recorded_at >= now() - INTERVAL 1 HOUR
GROUP BY equipment_id, equipment_type, plant_id
ORDER BY health_score;
```

## Mean Time Between Failures (MTBF)

```sql
SELECT
    equipment_id,
    equipment_type,
    count() AS failure_count,
    dateDiff('hour', min(opened_at), max(opened_at)) / nullIf(count() - 1, 0) AS mtbf_hours,
    avg(dateDiff('hour', opened_at, resolved_at)) AS avg_repair_hours
FROM work_orders wo
JOIN (SELECT equipment_id, equipment_type FROM equipment_sensors GROUP BY equipment_id, equipment_type LIMIT 1 BY equipment_id) e
    USING equipment_id
WHERE opened_at >= today() - 365
GROUP BY equipment_id, equipment_type
ORDER BY mtbf_hours;
```

## Summary

ClickHouse enables manufacturing predictive maintenance by detecting sensor anomalies, correlating pre-failure signals with maintenance records, and computing equipment health scores and MTBF. These analytics feed maintenance scheduling systems to prioritize interventions before failures disrupt production.
