# Validation Summary: How to Use ClickHouse for Sports Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, aggregate combinators)
- SQL (DDL, aggregation queries, window functions, subqueries)

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate functions reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse aggregate function combinators (-If, -Distinct): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse window functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse date-time functions (toYYYYMM, toStartOfMinute): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse data types (LowCardinality, DateTime64): https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
- **Nested aggregate in window function**: The "Team Performance Trends" query used `avg(sum(value)) OVER (...)` which nests an aggregate function inside a window function. ClickHouse does not reliably support this pattern. Rewrote the query to use a subquery that first computes `sum(value) AS total_score` in a GROUP BY, then applies `avg(total_score) OVER (...)` as a window function on the outer query. This is the standard and portable approach for ClickHouse.

## Review Notes
- The `PARTITION BY (sport, season)` clause in the `game_events` table uses a `LowCardinality(String)` column (`sport`) as part of the partition key. This is syntactically valid but could lead to suboptimal partition granularity if many distinct sport values exist. For a real deployment, consider whether a numeric sport ID or a coarser partition strategy would be more appropriate.
- All other SQL examples are syntactically correct and use idiomatic ClickHouse functions: `countIf`, `countDistinct`, `nullIf`, `toYYYYMM`, `toStartOfMinute`, `count()`, and `round`.
- The `countDistinct(fan_id)` usage is valid — ClickHouse supports the `-Distinct` combinator, which maps to `uniqExact` by default (controlled by the `count_distinct_implementation` setting). The more idiomatic ClickHouse approach would be `uniq()` or `uniqExact()`, but `countDistinct` is a supported alias.
