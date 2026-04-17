# How to Build Factory Floor Monitoring with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Factory, Manufacturing, IoT, Monitoring, MES

Description: Build factory floor monitoring in ClickHouse by ingesting machine telemetry, tracking shift production, measuring downtime, and computing OEE in real time.

---

Modern factories generate continuous telemetry from machines, PLCs, and sensors. ClickHouse ingests this data to provide real-time visibility into production throughput, machine health, and quality metrics.

## Machine Events Table

```sql
CREATE TABLE machine_events (
    machine_id   LowCardinality(String),
    line_id      LowCardinality(String),
    plant_id     LowCardinality(String),
    event_type   LowCardinality(String),  -- running, stopped, fault, changeover, idle
    fault_code   LowCardinality(Nullable(String)),
    parts_count  UInt32,
    cycle_time_s Float32,
    temperature_c Float32,
    speed_rpm    Float32,
    event_at     DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(event_at)
ORDER BY (plant_id, line_id, machine_id, event_at);
```

## Real-Time Machine Status

```sql
SELECT
    machine_id,
    line_id,
    argMax(event_type, event_at) AS current_status,
    argMax(fault_code, event_at) AS current_fault,
    max(event_at) AS last_update,
    dateDiff('minute', max(event_at), now()) AS minutes_since_update
FROM machine_events
WHERE event_at >= now() - INTERVAL 2 HOUR
GROUP BY machine_id, line_id
ORDER BY line_id, machine_id;
```

## Shift Production Count

Track parts produced per machine per shift:

```sql
SELECT
    machine_id,
    line_id,
    toDate(event_at) AS production_date,
    multiIf(
        toHour(event_at) < 8, 'Night',
        toHour(event_at) < 16, 'Day',
        'Evening'
    ) AS shift,
    sum(parts_count) AS total_parts,
    avg(cycle_time_s) AS avg_cycle_time_s
FROM machine_events
WHERE event_type = 'running'
  AND event_at >= today() - 7
GROUP BY machine_id, line_id, production_date, shift
ORDER BY production_date, shift, total_parts DESC;
```

## Downtime Analysis

Categorize and measure downtime events:

```sql
SELECT
    machine_id,
    line_id,
    event_type,
    fault_code,
    count() AS event_count,
    sum(gap_min) AS total_downtime_min
FROM (
    SELECT
        machine_id,
        line_id,
        event_type,
        fault_code,
        dateDiff('minute', event_at, leadInFrame(event_at) OVER (
            PARTITION BY machine_id ORDER BY event_at
            ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
        )) AS gap_min
    FROM machine_events
    WHERE event_at >= today() - 30
)
WHERE event_type IN ('stopped', 'fault', 'changeover', 'idle')
GROUP BY machine_id, line_id, event_type, fault_code
ORDER BY total_downtime_min DESC;
```

## Cycle Time Variation

Detect machines with inconsistent cycle times:

```sql
SELECT
    machine_id,
    line_id,
    avg(cycle_time_s) AS avg_cycle_s,
    stddevPop(cycle_time_s) AS std_cycle_s,
    min(cycle_time_s) AS min_cycle_s,
    max(cycle_time_s) AS max_cycle_s,
    round(stddevPop(cycle_time_s) / nullIf(avg(cycle_time_s), 0), 3) AS cv_cycle
FROM machine_events
WHERE event_type = 'running'
  AND event_at >= today() - 7
  AND cycle_time_s > 0
GROUP BY machine_id, line_id
ORDER BY cv_cycle DESC;
```

## Line Throughput vs. Target

Compare actual production rate against planned takt time:

```sql
SELECT
    line_id,
    toDate(event_at) AS day,
    sum(parts_count) AS actual_parts,
    960 AS planned_parts,  -- e.g. 2 parts/min * 480 min shift
    round(sum(parts_count) / 960.0 * 100, 2) AS attainment_pct
FROM machine_events
WHERE event_type = 'running'
  AND event_at >= today() - 7
GROUP BY line_id, day
ORDER BY line_id, day;
```

## Summary

ClickHouse provides real-time factory floor monitoring by ingesting machine events and computing production counts, downtime breakdowns, cycle time variation, and line attainment. Its high write throughput and fast aggregations make it ideal for MES-grade analytics in high-speed manufacturing environments.
