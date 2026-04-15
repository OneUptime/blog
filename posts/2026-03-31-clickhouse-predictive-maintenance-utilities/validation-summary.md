# Validation Summary: How to Build Predictive Maintenance for Utilities with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, conditional aggregates)
- SQL (window functions: AVG, stddevPop, lag; aggregate functions: avgIf, maxIf, countIf)
- IoT / sensor telemetry data modeling
- Predictive maintenance analytics

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on aggregate functions (stddevPop, avgIf, maxIf, countIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on MergeTree engine and partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on SELECT query clauses (WHERE, HAVING, GROUP BY): https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse documentation on multiIf: https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions#multiif

## Issues Found

### Issue 1: HAVING used without GROUP BY to filter window function results (Anomaly Score query)
- **What was wrong:** The query used `HAVING z_score > 3` to filter rows based on a window-function-derived column, but there was no `GROUP BY` clause. In SQL (and ClickHouse), `HAVING` is meant to filter groups after aggregation. Without `GROUP BY`, ClickHouse treats the entire result as a single group, so this would not filter individual rows as intended. The column `z_score` is a per-row value from a window function, not an aggregate result.
- **What was changed:** Wrapped the window function computation in a subquery and used `WHERE z_score > 3` on the outer query to correctly filter individual rows.
- **Why:** Window function results must be filtered in an outer query using WHERE, not with HAVING in the same query level.

### Issue 2: Window functions used in WHERE clause (Maintenance Due Prediction query)
- **What was wrong:** The query used `avg(value) OVER (...)` and `stddevPop(value) OVER (...)` directly in the `WHERE` clause. Window functions cannot appear in `WHERE` clauses in SQL — they are evaluated after WHERE and GROUP BY in the query execution order.
- **What was changed:** Restructured the query into a subquery that computes the window functions (`sensor_avg`, `sensor_std`), then filters on those computed columns in the outer query's `WHERE` clause before grouping and counting anomalies.
- **Why:** ClickHouse (like standard SQL) does not permit window functions in WHERE clauses. The window function results must be computed first in a subquery, then filtered in an outer query.

## Review Notes
- The CREATE TABLE schema is well-designed for this use case, with appropriate use of `LowCardinality(String)` for low-cardinality dimension columns and `PARTITION BY toYYYYMMDD()` for time-based partitioning.
- The Vibration Trend query uses `lag(avg(value)) OVER (...)` which is valid — window functions operate after GROUP BY, so `avg(value)` resolves to the grouped aggregate before `lag()` is applied.
- The comment "~7 days at 5-min intervals" correctly corresponds to 2016 rows (7 × 24 × 12 = 2016).
- The `PARTITION BY toYYYYMMDD(recorded_at)` partitioning scheme is appropriate for IoT telemetry workloads with time-range queries.
