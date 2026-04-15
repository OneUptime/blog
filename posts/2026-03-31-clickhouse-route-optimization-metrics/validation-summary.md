# Validation Summary: How to Track Route Optimization Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- Route optimization / logistics analytics concepts

## Sources Consulted
- ClickHouse documentation: CREATE TABLE and MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Aggregate functions (countIf, avg, sum, round) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: dateDiff function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation: Window functions (leadInFrame) — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: nullIf function — https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#nullif
- ClickHouse documentation: LowCardinality type — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: toStartOfWeek, toYYYYMM — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found

### 1. Nested aggregate functions in Weekly Route Efficiency Trend query
**What was wrong:** The original query used `avg(countIf(event_type = 'departed') / nullIf(countIf(event_type = 'planned'), 0))` — nesting `countIf` (an aggregate function) inside `avg` (another aggregate function). This is invalid SQL; aggregate functions cannot be nested.

**What was changed:** Rewrote the query to use a two-level approach: an inner subquery computes per-route `completion_rate` and `distance_ratio` using `countIf` and `sumIf`, then the outer query averages those per-route values by week using `avg`. Also improved the distance ratio calculation to only consider rows where `actual_km` is available.

**Why:** ClickHouse (like all SQL databases) does not allow nesting aggregate functions. The query would fail with a syntax error at execution time.

### 2. Correlated subquery in Stop Time Variability query
**What was wrong:** The original query used a correlated subquery inside `avg(dateDiff('minute', actual_at, (SELECT min(actual_at) FROM route_events re2 WHERE ...)))` to find the next stop's arrival time. Correlated subqueries in ClickHouse have limited support and this pattern — a correlated subquery inside an aggregate function argument — is unreliable and extremely inefficient as it would scan the table once per row.

**What was changed:** Replaced with a window function approach using `leadInFrame(...) OVER (PARTITION BY route_id ORDER BY stop_seq)` in a subquery to compute dwell time per stop, then aggregated in the outer query.

**Why:** The window function approach is both correct and idiomatic for ClickHouse. `leadInFrame` reliably fetches the next row's value within the partition, making the dwell time calculation straightforward and efficient.

## Review Notes
- The `CREATE TABLE` schema is well-designed with appropriate use of `LowCardinality` for low-cardinality string columns and `Nullable` for optional fields.
- In ClickHouse, the `/` operator on integer types (e.g., `UInt64 / UInt64`) returns `Float64`, so the division in the Route Completion Rate and On-Time Arrival queries is correct without explicit casting.
- The `HAVING deviation_pct > 10` clause in the Planned vs. Actual Distance query works in ClickHouse because ClickHouse allows referencing column aliases in `HAVING`.
- The `ORDER BY` key in the table definition places `route_date` last after `(route_id, stop_seq)`. This is intentional for this use case since most queries filter by `route_id` first, and `route_date` filtering is handled by partition pruning via `PARTITION BY toYYYYMM(route_date)`.
