# Validation Summary: How to Track User Engagement Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views)
- SQL (CTEs, aggregate functions, JOINs, subqueries)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Aggregate function combinators (-State, -Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation: AggregatingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation: SummingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation: uniq, uniqExact, countDistinct — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse documentation: Date/time functions (toDate, toMonday, toStartOfMonth, toYYYYMM, dateDiff) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: Materialized views — https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view

## Issues Found

### 1. Stickiness Ratio query referenced non-existent columns (Critical)
**What was wrong:** The middle subquery referenced `event_time` and `user_id` from the inner subquery, but the inner subquery only outputs `day`, `mau_month`, and `dau`. This would cause a runtime SQL error because those columns don't exist in the subquery result set. Additionally, `countDistinct(user_id)` cannot correctly compute MAU from pre-aggregated daily counts since a user active on multiple days would be counted multiple times.

**What was changed:** Restructured the query to use two CTEs — `daily` (computes per-day DAU) and `monthly` (computes per-month MAU from raw data) — joined on `mau_month`. This correctly computes both avg_dau and mau independently from the raw `user_events` table.

### 2. Materialized view used SummingMergeTree with countDistinct (Critical)
**What was wrong:** `SummingMergeTree()` sums numeric columns when merging rows with the same ORDER BY key. Using `countDistinct(user_id)` with SummingMergeTree means that when data arrives in multiple insert batches for the same `(day, feature)`, the distinct counts get summed — overcounting users who appear in multiple batches. This is a well-known anti-pattern in ClickHouse.

**What was changed:** Changed the engine to `AggregatingMergeTree()` and replaced `countDistinct(user_id)` with `uniqState(user_id)` and `count()` with `countState()`. Added a follow-up query example showing how to read from the MV using `uniqMerge()` and `countMerge()` combinators.

### 3. Summary incorrectly mentions "window functions" (Minor)
**What was wrong:** The summary claimed the post uses "window functions for session analysis," but no window functions (e.g., `ROW_NUMBER()`, `LAG()`, `LEAD()`) appear anywhere in the post. Session analysis uses standard `GROUP BY` with `min()`/`max()` aggregates.

**What was changed:** Replaced "window functions" with "aggregate functions with `GROUP BY`" in the summary paragraph.

## Review Notes
- The `countDistinct` function is valid in ClickHouse and maps to `uniqExact` by default (controlled by the `count_distinct_implementation` setting). All uses in non-MV queries are correct.
- The Feature Adoption Rate CTE doesn't include the 30-day filter in its definition, computing DAU for all historical days. This is not incorrect (the JOIN only matches days within the 30-day window from the main query), but adding the WHERE clause to the CTE would improve performance on large datasets.
- All ClickHouse data types (`UUID`, `UInt64`, `UInt32`, `LowCardinality(String)`, `DateTime`), functions (`toDate`, `toMonday`, `toStartOfMonth`, `toYYYYMM`, `dateDiff`, `generateUUIDv4`, `round`, `now`), and interval syntax are correct and current.
