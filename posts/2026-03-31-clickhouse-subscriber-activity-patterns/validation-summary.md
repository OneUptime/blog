# Validation Summary: How to Track Subscriber Activity Patterns in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate functions)
- Telecom subscriber analytics concepts (churn detection, cohort retention, segmentation)

## Sources Consulted
- ClickHouse documentation: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: aggregate functions (`uniqExact`, `uniqExactIf`, `countIf`, `multiIf`, `dateDiff`, `toYYYYMM`, `toDayOfWeek`, `toStartOfMonth`) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Date arithmetic and type behavior — https://clickhouse.com/docs/en/sql-reference/data-types/date

## Issues Found

### 1. Monthly Active Subscribers — `countIf` counts rows, not unique subscribers
- **What was wrong:** `countIf(data_mb > 0)` and `countIf(voice_mins > 0)` count the number of rows matching the condition, not unique subscribers. Since the table stores daily records and the query groups by month, a subscriber active on multiple days would be counted multiple times. The aliases `data_users` and `voice_users` imply unique user counts.
- **What was changed:** Replaced `countIf(data_mb > 0)` with `uniqExactIf(subscriber_id, data_mb > 0)` and `countIf(voice_mins > 0)` with `uniqExactIf(subscriber_id, voice_mins > 0)`.
- **Why:** `uniqExactIf` correctly counts distinct subscriber IDs matching the filter condition, consistent with the `uniqExact` used for `monthly_active` in the same query.

### 2. Top Plan Revenue Contribution — misleading section title
- **What was wrong:** The section was titled "Top Plan Revenue Contribution" but the query computes subscriber counts and average usage metrics (data_mb, voice_mins). No revenue or monetary metric (e.g., `top_up_amount`) is calculated.
- **What was changed:** Renamed the section to "Top Plans by Subscriber Count" to accurately reflect the query's ORDER BY and content.
- **Why:** The title should match what the query actually computes to avoid misleading readers.

### 3. Daily Activity Cohort Retention — broken query and wrong title
- **What was wrong:**
  1. The section title said "Daily Activity Cohort Retention" but the query uses `toYYYYMM` and `dateDiff('month', ...)`, making it a monthly cohort analysis.
  2. `any(first_month_count)` references a column `first_month_count` that does not exist in any table or subquery. This would cause a runtime error in ClickHouse.
- **What was changed:** Renamed section to "Monthly Cohort Retention". Rewrote the query to correctly compute `first_month_users` via a separate subquery that counts the number of subscribers per cohort month, then JOINs it with the activity counts.
- **Why:** The original query was non-functional due to the missing column reference. The fix computes cohort sizes from the same base data and joins them properly.

## Review Notes
- The `toDayOfWeek` function in the Weekly Usage Heatmap returns 1 (Monday) through 7 (Sunday) by default in ClickHouse. This is ISO 8601 convention and may differ from what some readers expect (US convention where Sunday = 1). This is technically correct but worth noting.
- The Churn Risk query's comment says "was active 2 months ago" for a 60-day window, which is approximate (60 days != exactly 2 months). This is acceptable as a rough heuristic for churn detection.
- The CREATE TABLE schema uses `Float32` for `data_mb` and `roaming_mb`. For telecom billing where precision matters, `Float64` or `Decimal` might be preferable, but `Float32` is adequate for analytics aggregation purposes as shown here.
