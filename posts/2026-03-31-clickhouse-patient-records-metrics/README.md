# How to Store and Analyze Patient Records Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Healthcare, Patient Analytics, Health Metric, HIPAA

Description: Use ClickHouse to store and query aggregated patient record metrics for population health analysis, quality reporting, and operational dashboards.

---

Healthcare organizations generate enormous volumes of clinical data. Aggregated patient metrics power population health dashboards, quality measure reporting, and care gap analysis. ClickHouse provides the analytical speed needed for these workloads without requiring patient-identifiable data to leave controlled environments.

## Aggregated Patient Metrics Table

```sql
-- Store aggregated/de-identified metrics only
CREATE TABLE patient_metrics_agg (
    facility_id         UInt32,
    department          LowCardinality(String),
    icd10_code          LowCardinality(String),   -- diagnosis code
    age_bucket          LowCardinality(String),   -- '18-34', '35-54', etc.
    gender              FixedString(1),
    recorded_month      Date,
    encounter_count     UInt32,
    readmission_count   UInt16,
    total_los_days      Float32,   -- total length of stay days
    total_cost_cents    UInt64,
    preventable_admits  UInt16
) ENGINE = SummingMergeTree()
ORDER BY (facility_id, department, icd10_code, age_bucket, gender, recorded_month)
PARTITION BY toYear(recorded_month);
```

## Top Diagnoses by Encounter Volume

```sql
SELECT
    icd10_code,
    sum(encounter_count)    AS encounters,
    sum(readmission_count)  AS readmissions,
    round(sum(total_cost_cents) / sum(encounter_count) / 100, 2) AS avg_cost_per_encounter
FROM patient_metrics_agg
WHERE recorded_month >= today() - 365
GROUP BY icd10_code
ORDER BY encounters DESC
LIMIT 20;
```

## Readmission Rate by Department

```sql
SELECT
    department,
    sum(encounter_count)     AS total_encounters,
    sum(readmission_count)   AS total_readmissions,
    round(100.0 * sum(readmission_count) / sum(encounter_count), 2) AS readmission_rate_pct
FROM patient_metrics_agg
WHERE recorded_month >= toStartOfMonth(today() - INTERVAL 12 MONTH)
GROUP BY department
ORDER BY readmission_rate_pct DESC;
```

## Length of Stay Trend

```sql
SELECT
    recorded_month,
    department,
    round(sum(total_los_days) / sum(encounter_count), 2) AS weighted_avg_los
FROM patient_metrics_agg
WHERE recorded_month >= today() - 365
GROUP BY recorded_month, department
ORDER BY recorded_month, department;
```

## Preventable Admission Rate by Age Bucket

```sql
SELECT
    age_bucket,
    sum(encounter_count)        AS encounters,
    sum(preventable_admits)     AS preventable,
    round(100.0 * sum(preventable_admits) / sum(encounter_count), 2) AS preventable_pct
FROM patient_metrics_agg
WHERE recorded_month >= today() - 180
GROUP BY age_bucket
ORDER BY preventable_pct DESC;
```

## Monthly Cost per Encounter Trend

```sql
SELECT
    recorded_month,
    round(sum(total_cost_cents) / sum(encounter_count) / 100, 2) AS avg_cost
FROM patient_metrics_agg
WHERE recorded_month >= today() - 365
GROUP BY recorded_month
ORDER BY recorded_month;
```

## Facility Benchmarking

```sql
SELECT
    facility_id,
    sum(encounter_count)     AS encounters,
    round(100.0 * sum(readmission_count) / sum(encounter_count), 2) AS readmit_pct,
    round(sum(total_los_days) / sum(encounter_count), 2) AS avg_los,
    round(sum(total_cost_cents) / sum(encounter_count) / 100, 2) AS cost_per_encounter
FROM patient_metrics_agg
WHERE recorded_month >= today() - 365
GROUP BY facility_id
ORDER BY readmit_pct DESC;
```

## Summary

ClickHouse is a powerful backend for population health analytics when working with aggregated, de-identified metrics. Its columnar storage efficiently compresses repetitive ICD-10 codes and department names, `SummingMergeTree` eliminates double-counting during data loads, and the fast aggregation engine supports real-time quality measure dashboards without straining production EHR systems.
