# How to Track Equipment OEE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, OEE, Manufacturing, IoT, Time-Series, Analytics

Description: Learn how to store and calculate Overall Equipment Effectiveness (OEE) metrics for industrial equipment in ClickHouse using time-series data and SQL aggregations.

---

## What Is OEE

Overall Equipment Effectiveness (OEE) is a manufacturing KPI that measures how well a production process performs relative to its full potential. It is the product of three factors:

```text
OEE = Availability * Performance * Quality

Availability = Actual Run Time / Planned Production Time
Performance  = (Ideal Cycle Time * Total Count) / Run Time
Quality      = Good Count / Total Count
```

A perfect OEE score of 100% means producing only good parts, as fast as possible, with no downtime.

## Schema Design for OEE Tracking

```sql
-- Equipment definition table
CREATE TABLE equipment (
    equipment_id  UInt32,
    name          String,
    line          String,
    ideal_cycle_time_sec Float32
) ENGINE = ReplacingMergeTree()
ORDER BY equipment_id;

-- Machine state events (uptime/downtime)
CREATE TABLE machine_states (
    ts              DateTime,
    equipment_id    UInt32,
    state           LowCardinality(String),  -- 'running', 'planned_downtime', 'unplanned_downtime', 'idle'
    reason          LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (equipment_id, ts);

-- Production counts table
CREATE TABLE production_counts (
    ts              DateTime,
    equipment_id    UInt32,
    total_count     UInt32,
    good_count      UInt32,
    reject_count    UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (equipment_id, ts);
```

## Inserting Machine State Data

```sql
INSERT INTO machine_states (ts, equipment_id, state, reason) VALUES
('2026-03-31 06:00:00', 1, 'running', ''),
('2026-03-31 07:30:00', 1, 'unplanned_downtime', 'jam'),
('2026-03-31 07:55:00', 1, 'running', ''),
('2026-03-31 10:00:00', 1, 'planned_downtime', 'lunch_break'),
('2026-03-31 10:30:00', 1, 'running', ''),
('2026-03-31 14:00:00', 1, 'idle', 'shift_end');

INSERT INTO production_counts (ts, equipment_id, total_count, good_count, reject_count) VALUES
('2026-03-31 14:00:00', 1, 4800, 4650, 150);
```

## Calculating Availability

```sql
WITH
    shift_start AS (SELECT toDateTime('2026-03-31 06:00:00')),
    shift_end   AS (SELECT toDateTime('2026-03-31 14:00:00')),
    planned_production_time AS (SELECT 8 * 3600 - 30 * 60)  -- 8h shift minus 30min planned break

SELECT
    equipment_id,
    sum(if(state = 'running', run_duration, 0)) AS actual_run_time_sec,
    (SELECT * FROM planned_production_time) AS planned_time_sec,
    round(sum(if(state = 'running', run_duration, 0)) /
          (SELECT * FROM planned_production_time) * 100, 1) AS availability_pct
FROM (
    SELECT
        equipment_id,
        state,
        dateDiff('second', ts, lead(ts) OVER (PARTITION BY equipment_id ORDER BY ts)) AS run_duration
    FROM machine_states
    WHERE ts >= (SELECT * FROM shift_start) AND ts <= (SELECT * FROM shift_end)
      AND equipment_id = 1
)
GROUP BY equipment_id;
```

## Calculating Full OEE

```sql
WITH
    shift_params AS (
        SELECT
            1 AS equipment_id,
            toDateTime('2026-03-31 06:00:00') AS shift_start,
            toDateTime('2026-03-31 14:00:00') AS shift_end,
            7.5 * 3600 AS planned_production_time_sec,  -- 7.5h planned
            3.0 AS ideal_cycle_time_sec  -- 3 seconds per unit
    ),
    state_durations AS (
        SELECT
            equipment_id,
            state,
            dateDiff('second', ts, lead(ts) OVER (PARTITION BY equipment_id ORDER BY ts)) AS duration_sec
        FROM machine_states
        JOIN shift_params USING (equipment_id)
        WHERE ts >= shift_params.shift_start
          AND ts <= shift_params.shift_end
    ),
    run_time AS (
        SELECT
            equipment_id,
            sum(if(state = 'running', duration_sec, 0)) AS actual_run_sec
        FROM state_durations
        GROUP BY equipment_id
    ),
    production AS (
        SELECT equipment_id, total_count, good_count
        FROM production_counts
        JOIN shift_params USING (equipment_id)
        WHERE ts BETWEEN shift_params.shift_start AND shift_params.shift_end
    )
SELECT
    p.equipment_id,
    round(r.actual_run_sec / sp.planned_production_time_sec * 100, 1) AS availability_pct,
    round((sp.ideal_cycle_time_sec * p.total_count) / r.actual_run_sec * 100, 1) AS performance_pct,
    round(p.good_count / p.total_count * 100, 1) AS quality_pct,
    round(
        (r.actual_run_sec / sp.planned_production_time_sec) *
        ((sp.ideal_cycle_time_sec * p.total_count) / r.actual_run_sec) *
        (p.good_count / p.total_count) * 100, 1
    ) AS oee_pct
FROM production p
JOIN run_time r USING (equipment_id)
JOIN shift_params sp USING (equipment_id);
```

## Daily OEE Trend Query

```sql
SELECT
    toDate(ts) AS day,
    equipment_id,
    sum(good_count) AS good_parts,
    sum(total_count) AS total_parts,
    round(sum(good_count) / sum(total_count) * 100, 1) AS quality_pct
FROM production_counts
WHERE ts >= today() - 30
GROUP BY day, equipment_id
ORDER BY day DESC, equipment_id;
```

## Summary

ClickHouse is well-suited for OEE tracking due to its time-series performance and efficient aggregations over large volumes of machine state and production count data. Design your schema with separate tables for machine states, production counts, and equipment metadata. Calculate OEE components (Availability, Performance, Quality) using window functions to compute state durations, then multiply them together for the composite OEE percentage. Use daily trend queries to identify declining equipment performance over time.
