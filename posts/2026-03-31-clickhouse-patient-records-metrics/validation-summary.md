# Validation Summary: How to Store and Analyze Patient Records Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SummingMergeTree engine, LowCardinality, FixedString, Date types)
- SQL (aggregation queries, date arithmetic, INTERVAL syntax)
- Healthcare data modeling (ICD-10 codes, encounter metrics, readmission tracking)

## Sources Consulted
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Date type and date arithmetic: https://clickhouse.com/docs/en/sql-reference/data-types/date
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse round() function: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions
- ClickHouse toStartOfMonth() function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofmonth
- ClickHouse toYear() function: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#toyear

## Issues Found

### Issue 1: Dimension columns missing from ORDER BY (sorting key)
**What was wrong:** The ORDER BY was `(facility_id, department, icd10_code, recorded_month)`, but `age_bucket` and `gender` are dimension columns (not metrics). SummingMergeTree merges rows with the same sorting key — rows that differ only in `age_bucket` or `gender` would be collapsed during background merges. For non-key non-numeric columns like `age_bucket` (String) and `gender` (FixedString), ClickHouse picks an arbitrary value from the merged rows. This breaks the "Preventable Admission Rate by Age Bucket" query, which GROUP BYs on `age_bucket`.

**What was changed:** Added `age_bucket` and `gender` to the ORDER BY: `ORDER BY (facility_id, department, icd10_code, age_bucket, gender, recorded_month)`.

**Why:** All dimension columns that are used for filtering or grouping must be part of the sorting key in SummingMergeTree to prevent data loss during merges.

### Issue 2: Storing averages in a SummingMergeTree column
**What was wrong:** The column `avg_los_days` (Float32) stored an average (length of stay). SummingMergeTree sums all numeric non-key columns during merges. Summing averages is mathematically incorrect. Example: two rows with `avg_los_days=3.0` (10 encounters) and `avg_los_days=5.0` (20 encounters) merge to `avg_los_days=8.0, encounter_count=30`. The query `sum(avg_los_days * encounter_count) / sum(encounter_count)` then yields `8.0*30/30 = 8.0`, but the correct weighted average is `(3.0*10 + 5.0*20)/30 = 4.33`.

**What was changed:** Renamed `avg_los_days` to `total_los_days` — storing the sum of length-of-stay days (an additive metric). Updated the Length of Stay Trend and Facility Benchmarking queries from `sum(avg_los_days * encounter_count) / sum(encounter_count)` to `sum(total_los_days) / sum(encounter_count)`.

**Why:** SummingMergeTree requires all non-key numeric columns to be additive (summable) metrics. Averages, ratios, and percentages must be computed at query time from their summable components.

## Review Notes
- Several queries divide by `sum(encounter_count)` without a guard against zero. ClickHouse handles this gracefully (returns `inf` or `nan` for floating-point division, not an error), so this is not a bug, but production dashboards may want to wrap with `if(sum(encounter_count) = 0, 0, ...)` for cleaner output.
- The summary's claim that "SummingMergeTree eliminates double-counting during data loads" is a simplification — SummingMergeTree merges rows with the same sorting key by summing numeric columns, which is useful for incremental/idempotent loads, but it doesn't inherently prevent double-counting if the same data is inserted twice with different key combinations. This is acceptable for a high-level summary.
- The post correctly avoids storing patient-identifiable information (PII/PHI) and works only with aggregated, de-identified metrics, which is appropriate for the HIPAA context mentioned in the tags.
