# How to Build Defect Rate Tracking with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Defect Rate, Quality, Manufacturing, DPM, Analytics

Description: Build defect rate tracking in ClickHouse to compute DPM, identify defect trends by product line, and correlate defects with process parameters.

---

Defect rate tracking is fundamental to quality management. ClickHouse enables fast computation of defects per million (DPM), trend analysis, and root cause correlation queries across large inspection datasets.

## Defect Records Table

```sql
CREATE TABLE defect_records (
    defect_id     UUID,
    plant_id      LowCardinality(String),
    line_id       LowCardinality(String),
    workstation   LowCardinality(String),
    part_number   LowCardinality(String),
    batch_id      String,
    defect_type   LowCardinality(String),
    defect_code   LowCardinality(String),
    severity      LowCardinality(String),  -- critical, major, minor
    quantity_defective UInt32,
    quantity_inspected UInt32,
    detected_at   LowCardinality(String),  -- in_process, end_of_line, customer
    operator_id   LowCardinality(String),
    recorded_at   DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (plant_id, line_id, part_number, recorded_at);
```

## Defects Per Million (DPM) by Product

```sql
SELECT
    part_number,
    sum(quantity_defective) AS total_defects,
    sum(quantity_inspected) AS total_inspected,
    round(sum(quantity_defective) / nullIf(sum(quantity_inspected), 0) * 1000000, 0) AS dpm
FROM defect_records
WHERE recorded_at >= today() - 30
GROUP BY part_number
ORDER BY dpm DESC;
```

## Defect Trend - Weekly DPM

Track DPM trend to assess quality improvement:

```sql
SELECT
    line_id,
    toStartOfWeek(recorded_at) AS week,
    round(sum(quantity_defective) / nullIf(sum(quantity_inspected), 0) * 1000000, 0) AS weekly_dpm,
    weekly_dpm - lagInFrame(weekly_dpm) OVER (PARTITION BY line_id ORDER BY week) AS dpm_change
FROM defect_records
WHERE recorded_at >= today() - 90
GROUP BY line_id, week
ORDER BY line_id, week;
```

## Defect Type Pareto

Identify the vital few defect types driving most failures:

```sql
SELECT
    defect_type,
    defect_code,
    sum(quantity_defective) AS total_defects,
    round(sum(quantity_defective) / sum(sum(quantity_defective)) OVER () * 100, 2) AS pct_of_total,
    round(sum(sum(quantity_defective)) OVER (ORDER BY sum(quantity_defective) DESC) /
        sum(sum(quantity_defective)) OVER () * 100, 2) AS cumulative_pct
FROM defect_records
WHERE recorded_at >= today() - 30
GROUP BY defect_type, defect_code
ORDER BY total_defects DESC;
```

## Escaped Defects - Customer Detected

Track defects not caught in-house:

```sql
SELECT
    part_number,
    defect_type,
    countIf(detected_at = 'customer') AS escaped_defects,
    countIf(detected_at IN ('in_process', 'end_of_line')) AS caught_in_process,
    round(countIf(detected_at = 'customer') /
        nullIf(count(), 0) * 100, 2) AS escape_rate_pct
FROM defect_records
WHERE recorded_at >= today() - 90
GROUP BY part_number, defect_type
HAVING escaped_defects > 0
ORDER BY escape_rate_pct DESC;
```

## Critical Defect Alert

Immediately flag critical severity defects:

```sql
SELECT
    plant_id,
    line_id,
    part_number,
    defect_code,
    sum(quantity_defective) AS critical_defects,
    max(recorded_at) AS latest_occurrence
FROM defect_records
WHERE severity = 'critical'
  AND recorded_at >= today()
GROUP BY plant_id, line_id, part_number, defect_code
ORDER BY critical_defects DESC;
```

## Summary

ClickHouse enables comprehensive defect rate tracking - DPM computation, weekly trend analysis, Pareto breakdowns, and escaped defect monitoring are all fast and scalable. These analytics form the backbone of a quality management system that drives continuous improvement.
