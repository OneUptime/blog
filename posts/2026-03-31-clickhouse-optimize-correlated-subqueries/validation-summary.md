# Validation Summary: How to Optimize Correlated Subqueries in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, query optimizer, aggregate functions, window functions)
- SQL (correlated subqueries, JOINs, CTEs, window functions, EXISTS, IN operator)

## Sources Consulted
- ClickHouse official documentation: Window Functions / row_number — https://clickhouse.com/docs/sql-reference/window-functions/row_number
- ClickHouse official documentation: argMax aggregate function — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse official documentation: IN operator — https://clickhouse.com/docs/sql-reference/operators/in
- ClickHouse official documentation: Array functions (has) — https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse official documentation: groupArray — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse official documentation: JOIN algorithms — https://clickhouse.com/docs/guides/joining-tables
- ClickHouse official documentation: EXPLAIN statement — https://clickhouse.com/docs/sql-reference/statements/explain

## Issues Found

### 1. Redundant `argMax(event_time, event_time)` usage
**What was wrong:** The post used `argMax(event_time, event_time)` to get the latest event_time per user. Since `argMax(arg, val)` returns the value of `arg` at the maximum `val`, using the same column for both arguments is equivalent to `max(event_time)` — technically correct but unnecessarily confusing and fails to demonstrate argMax's actual purpose.
**What was changed:** Replaced with `max(event_time)` for the simple case, and added a separate `argMax(event_type, event_time)` example that properly demonstrates argMax's value (retrieving a different column's value at the row with the maximum event_time).

### 2. Incorrect claim about "nested loop" in EXPLAIN output
**What was wrong:** The post stated: "If it shows a nested loop, you need to rewrite manually." ClickHouse does not have a nested loop join algorithm. Its supported join algorithms are hash, parallel_hash, direct, grace_hash, full_sorting_merge, and partial_merge. The "nested loop" concept was incorrectly borrowed from PostgreSQL/MySQL documentation.
**What was changed:** Removed the nested loop reference. Rephrased to accurately describe what to look for: if the plan does not show a join-based strategy for a correlated subquery, manual rewriting is needed.

### 3. Unnecessary `DISTINCT` inside `IN` subquery
**What was wrong:** The post used `SELECT DISTINCT user_id` inside an `IN` subquery. ClickHouse converts the right side of `IN` into a hash set internally, which inherently deduplicates values. The `DISTINCT` keyword adds unnecessary processing overhead for non-distributed queries.
**What was changed:** Removed `DISTINCT` from the `IN` subquery.

## Review Notes
- ClickHouse's support for correlated subqueries was historically limited (they were unsupported). Experimental support was added in version 25.x behind the `allow_experimental_correlated_subqueries` setting. The blog's general advice to rewrite correlated subqueries as JOINs/CTEs/window functions remains excellent practical guidance regardless. The introductory framing about "row-by-row execution" is a reasonable conceptual explanation of why correlated subqueries are problematic, even though ClickHouse's actual behavior differs from traditional RDBMS engines.
- The `DISTINCT` keyword inside `IN` subqueries can be beneficial when used with `GLOBAL IN` in distributed queries to reduce network transfer volume. The blog doesn't discuss distributed queries so the removal is appropriate.
- All other SQL examples (`row_number()`, JOIN rewrites, CTEs, `has()`, `groupArray()`) are syntactically correct and idiomatic ClickHouse SQL.
