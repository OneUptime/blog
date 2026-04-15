# Validation Summary: How to Build SLO Monitoring with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, DateTime64, LowCardinality, countIf, nullIf, WITH/CTE clauses)
- SLO/SLA monitoring concepts (error budgets, burn rates, compliance windows)
- Google SRE multi-window burn rate alerting methodology

## Sources Consulted
- ClickHouse documentation on WITH clause (CTE syntax): https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse documentation on aggregate functions (count, countIf, round, nullIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on MergeTree engine and PARTITION BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on DateTime64 type: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- Google SRE Workbook, Chapter 5 — Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found

### 1. Incorrect WITH clause syntax for scalar CTE (Error Budget Remaining query)
- **What was wrong:** `WITH slo_target AS 0.999` uses the wrong order for ClickHouse scalar expression CTEs. ClickHouse requires `WITH <expression> AS <identifier>`, not `WITH <identifier> AS <expression>`. The latter form (`WITH name AS (...)`) is reserved for subquery CTEs and requires parentheses.
- **What was changed:** Corrected to `WITH 0.999 AS slo_target`.
- **Why:** The original syntax would produce a parse error in ClickHouse. The expression must come before `AS` and the identifier after.

### 2. Incorrect burn rate exhaustion claim in Summary
- **What was wrong:** The summary stated that a 14.4x burn rate "would exhaust a 30-day error budget in 2 hours." At 14.4x, the budget would actually be exhausted in approximately 50 hours (30 days / 14.4 ≈ 2.08 days). The 14.4x threshold is designed so that a 1-hour detection window catches when ~2% of the monthly budget has been consumed (14.4 / 720 ≈ 0.02 = 2%).
- **What was changed:** Corrected to "detects when approximately 2% of a 30-day error budget has been consumed in one hour."
- **Why:** The original claim conflated the 1-hour detection window with the time to full budget exhaustion. A burn rate of 360x would be needed to exhaust the budget in 2 hours.

## Review Notes
- The `toYYYYMMDD` partitioning scheme creates daily partitions. For very high-volume workloads, monthly partitioning (`toYYYYMM`) may be more appropriate to avoid excessive partition counts, but daily partitioning is valid and reasonable for many use cases.
- The `now()` function returns `DateTime` while `recorded_at` is `DateTime64(3)`. ClickHouse handles this comparison via implicit type conversion, so it works correctly, though `now64(3)` could be used for explicit precision matching.
- The `compliance_delta` column in the first query hardcodes `99.9` as the SLO target percentage. This is consistent with the 0.999 target used elsewhere but could benefit from being parameterized via a WITH clause for maintainability.
