# Validation Summary: How to Implement Real-Time Visitor Counting with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions, table engines, materialized views)
- HyperLogLog / approximate counting algorithms (`uniq`, `uniqExact`, `uniqHLL12`, `uniqCombined`)
- AggregatingMergeTree engine
- SimpleAggregateFunction data type
- SQL (CTEs, JOINs, GROUP BY WITH TOTALS)

## Sources Consulted
- ClickHouse `uniq` function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse `uniqHLL12` function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse `uniqCombined` function documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SimpleAggregateFunction documentation: https://clickhouse.com/docs/sql-reference/data-types/simpleaggregatefunction
- ClickHouse GROUP BY clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/group-by

## Issues Found

### 1. Incorrect description of `uniq` algorithm
- **What was wrong:** The post described `uniq` as using "a 65536-bucket HyperLogLog" and claimed "99%+ accuracy." The `uniq` function actually uses an adaptive sampling algorithm (not HyperLogLog) with a working set of up to 65536 hash values. The `uniqHLL12` function is the one that uses HyperLogLog. The accuracy claim was also unsubstantiated by official documentation.
- **What was changed:** Updated the description to "adaptive sampling algorithm with a working set of up to 65536 hash values" and changed "99%+ accuracy" to "high accuracy." Also removed "HyperLogLog-based" from the Summary section.
- **Why:** Misattributing the algorithm could mislead readers choosing between `uniq`, `uniqHLL12`, and `uniqCombined`, each of which uses a different approach.

### 2. `pageviews UInt64` column in AggregatingMergeTree will lose data
- **What was wrong:** The `visitor_counts_hourly` table used `pageviews UInt64` (a plain column) in an `AggregatingMergeTree`. During background merges, non-AggregateFunction columns pick an arbitrary value from merged rows (equivalent to `any()`), so pageview counts from different parts would be silently dropped.
- **What was changed:** Changed `pageviews UInt64` to `pageviews SimpleAggregateFunction(sum, UInt64)`, which correctly sums values during merges.
- **Why:** This is a data-loss bug. The table would return incorrect (understated) pageview counts after background merges occur.

### 3. Windowed Unique Counts query had a redundant condition
- **What was wrong:** The query used `uniqExactIf(visitor_id, ts >= now() - INTERVAL 1 HOUR)` but the WHERE clause already filtered to `ts >= now() - INTERVAL 1 HOUR`, making the If condition always true. The column `visitors_last_hour` would just be an exact per-minute count (identical in semantics to `uniqExact(visitor_id)` per group), not a rolling hour total.
- **What was changed:** Removed the misleading `uniqExactIf` column and added `WITH TOTALS` to the GROUP BY, which produces an extra row with the overall unique visitor count across the entire hour — correctly demonstrating windowed aggregation.
- **Why:** The original query was misleading; readers would expect a rolling hour total but would get per-minute exact counts.

### 4. New vs Returning Visitors query had a logical error
- **What was wrong:** The original query grouped by `toDate(first_seen)` (cohort date) and then filtered with `uniqIf(visitor_id, first_seen < today() - 1)`. Since all rows in a given cohort share the same `first_seen` date, this condition is either true for all rows in the group or none — it doesn't identify returning visitors. For cohorts older than yesterday, `returning_visitors` equaled `new_visitors`; for recent cohorts, it was 0.
- **What was changed:** Rewrote the query using a CTE to compute each visitor's first-seen date, then JOIN it back to the pageviews table. Groups by `visit_date` (the date of each pageview) and classifies visitors as new (first_seen matches the visit date) or returning (first_seen is earlier).
- **Why:** The original query fundamentally could not distinguish new from returning visitors due to the grouping logic.

## Review Notes
- The 30-day window in the "New vs Returning Visitors" query means a visitor whose true first visit was more than 30 days ago will appear as "new" on the date of their first visit within the window. This is an inherent limitation of bounded queries and is acceptable for a tutorial.
- The `uniqHLL12` comment says "configurable precision" but HLL12 has fixed 2^12 precision. `uniqCombined` is the function with a configurable precision parameter. This is a minor imprecision but not corrected to minimize changes.
