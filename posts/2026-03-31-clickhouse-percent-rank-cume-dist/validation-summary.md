# Validation Summary: How to Use PERCENT_RANK() and CUME_DIST() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL window functions (PERCENT_RANK, CUME_DIST, RANK)
- ClickHouse quantile() aggregate functions
- ClickHouse built-in functions (intDiv, ROUND, today)

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on PERCENT_RANK: https://clickhouse.com/docs/en/sql-reference/window-functions/percent_rank
- ClickHouse documentation on CUME_DIST: https://clickhouse.com/docs/en/sql-reference/window-functions/cume_dist
- SQL standard definitions for PERCENT_RANK and CUME_DIST (ISO/IEC 9075)
- ClickHouse documentation on quantile functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile

## Issues Found
1. **Incorrect CDF query using CUME_DIST() over grouped data** (Section: "Building a Cumulative Distribution Function"): The original query applied `CUME_DIST()` to rows produced by `GROUP BY response_time_bucket`. After grouping, each row represents one bucket, not one request. `CUME_DIST()` therefore computed the fraction of *buckets* at or below a given value, not the fraction of *requests*. For example, with 100 equal-sized buckets, every bucket would get cdf_pct increments of 1% regardless of how many requests each bucket contained. Fixed by replacing `CUME_DIST()` with a cumulative `SUM(request_count)` window divided by the total count, which correctly weights each bucket by its request count to produce a true CDF.

## Review Notes
- The formulas, side-by-side comparison table, and all computed values (percent_rank and cume_dist for scores 60, 70, 70, 80, 100) were manually verified and are correct.
- The post correctly notes that window function aliases cannot be used directly in WHERE clauses and provides the subquery workaround. The first query in "Identifying Users Above a Percentile Threshold" is intentionally shown as incorrect for pedagogical purposes before the corrected version.
- The CASE-based segmentation query in "Segmenting by Relative Position" calls PERCENT_RANK() multiple times with the same window spec. While functionally correct, ClickHouse will compute it once due to common subexpression elimination.
- The post does not mention the edge case where a partition has only one row: PERCENT_RANK() returns 0 (the SQL standard defines 0/0 as 0 for this function). This is a minor omission that does not constitute an error.
- All ClickHouse-specific syntax (COUNT() without arguments, quantile(p)(column), intDiv(), today() - 1) is correct.
