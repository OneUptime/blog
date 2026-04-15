# How to Analyze Quality Control Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Quality Control, Manufacturing, SPC, Defect, Analytics

Description: Analyze quality control data in ClickHouse - compute control charts, track defect rates by type, run Pareto analysis, and implement SPC monitoring.

---

Statistical Process Control (SPC) and quality analytics are essential for manufacturing operations. ClickHouse can compute control chart limits, track defect patterns, and power Pareto analyses at scale.

## Quality Inspection Table

```sql
CREATE TABLE quality_inspections (
    inspection_id UUID,
    plant_id      LowCardinality(String),
    line_id       LowCardinality(String),
    workstation   LowCardinality(String),
    part_number   LowCardinality(String),
    batch_id      String,
    measurement   LowCardinality(String),
    value         Float64,
    unit          LowCardinality(String),
    pass_fail     LowCardinality(String),  -- pass, fail
    defect_code   Nullable(LowCardinality(String)),
    inspector_id  LowCardinality(String),
    inspected_at  DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(inspected_at)
ORDER BY (plant_id, line_id, part_number, inspected_at);
```

## Control Chart Data (X-bar)

Compute subgroup means and control limits for SPC charts:

```sql
SELECT
    part_number,
    measurement,
    toStartOfHour(inspected_at) AS subgroup,
    avg(value) AS x_bar,
    stddevSamp(value) AS s,
    count() AS n,
    avg(avg(value)) OVER (PARTITION BY part_number, measurement) AS grand_mean,
    avg(avg(value)) OVER (PARTITION BY part_number, measurement)
        + 3 * avg(stddevSamp(value)) OVER (PARTITION BY part_number, measurement) / sqrt(count()) AS ucl,
    avg(avg(value)) OVER (PARTITION BY part_number, measurement)
        - 3 * avg(stddevSamp(value)) OVER (PARTITION BY part_number, measurement) / sqrt(count()) AS lcl
FROM quality_inspections
WHERE inspected_at >= today() - 30
GROUP BY part_number, measurement, subgroup
ORDER BY part_number, measurement, subgroup;
```

## Defect Rate by Workstation

```sql
SELECT
    workstation,
    count() AS total_inspections,
    countIf(pass_fail = 'fail') AS failures,
    round(countIf(pass_fail = 'fail') / count() * 100, 3) AS defect_rate_pct
FROM quality_inspections
WHERE inspected_at >= today() - 30
GROUP BY workstation
ORDER BY defect_rate_pct DESC;
```

## Pareto Analysis of Defect Codes

Identify the 20% of defect types causing 80% of failures:

```sql
WITH defect_stats AS (
    SELECT
        defect_code,
        count() AS defect_count,
        sum(count()) OVER () AS total_defects,
        round(count() / sum(count()) OVER () * 100, 2) AS defect_pct
    FROM quality_inspections
    WHERE pass_fail = 'fail'
      AND defect_code IS NOT NULL
      AND inspected_at >= today() - 30
    GROUP BY defect_code
)
SELECT
    defect_code,
    defect_count,
    total_defects,
    defect_pct,
    sum(defect_pct) OVER (ORDER BY defect_count DESC) AS cumulative_pct
FROM defect_stats
ORDER BY defect_count DESC;
```

## Process Capability (Cpk)

Compute Cpk for a critical measurement:

```sql
SELECT
    part_number,
    measurement,
    avg(value) AS mean_value,
    stddevPop(value) AS sigma,
    1.5 AS usl_offset,  -- replace with actual spec limits
    round((1.5 - avg(value)) / nullIf(3 * stddevPop(value), 0), 3) AS cpu,
    round((avg(value) - (-1.5)) / nullIf(3 * stddevPop(value), 0), 3) AS cpl,
    least(
        (1.5 - avg(value)) / nullIf(3 * stddevPop(value), 0),
        (avg(value) - (-1.5)) / nullIf(3 * stddevPop(value), 0)
    ) AS cpk
FROM quality_inspections
WHERE inspected_at >= today() - 30
  AND measurement = 'diameter_mm'
GROUP BY part_number, measurement
ORDER BY cpk;
```

## Summary

ClickHouse enables manufacturing quality analytics at scale - control chart computation, defect rate tracking, Pareto analysis, and process capability indices are all achievable with SQL. Fast aggregations over millions of inspection records make it practical to run SPC analysis in near real time.
