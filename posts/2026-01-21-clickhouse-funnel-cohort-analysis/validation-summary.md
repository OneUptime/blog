# Validation Summary: How to Use ClickHouse for Funnel and Cohort Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse parametric aggregate functions: `windowFunnel`, `retention`, `sequenceMatch`, `sequenceCount`
- ClickHouse window functions
- ClickHouse materialized views
- ClickHouse MergeTree-family engines: `SummingMergeTree`, `ReplacingMergeTree`
- ClickHouse data skipping indexes, `PREWHERE`, and sampling

## Sources Consulted
- ClickHouse official documentation: Parametric Aggregate Functions (`windowFunnel`, `retention`, `sequenceMatch`, `sequenceCount`) - https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse official documentation: Aggregate Function Combinators - https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation: AggregateFunction type and `-State` / `-Merge` selection pattern - https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse official documentation: `groupArray` aggregate function - https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse official documentation: `SummingMergeTree` table engine - https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse official documentation: Incremental materialized views - https://clickhouse.com/docs/materialized-view/incremental-materialized-view
- ClickHouse official documentation: `GROUP BY` clause - https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse official documentation: Window functions - https://clickhouse.com/docs/sql-reference/window-functions

## Issues Found
- The basic retention query selected a `users` column that was never defined after `ARRAY JOIN`. I changed it to `count() AS users` so the grouped query returns a valid count per retention week.
- The N-day retention and rolling retention examples derived `signup_date` / `first_date` from the first event of any type. I changed these to `minIf(..., event_type = 'signup')` and filtered out users with no signup event so the examples match their signup-retention descriptions.
- The `sequenceMatch` examples used an aggregate function in the `WHERE` clause while also counting distinct users. I rewrote them to compute `sequenceMatch` per `user_id` in a grouped subquery, then count matched users in the outer query.
- The common-path query relied on `groupArray(event_type)` order from an ordered subquery. ClickHouse documents `groupArray` order as indeterminate except for limited cases, so I changed the example to sort collected `(event_time, event_type)` tuples explicitly before extracting event names.
- The daily funnel materialized-view example stored a per-user `max_step` in a `SummingMergeTree` ordered only by day and acquisition source. That layout would sum `max_step` values during merges and make the later `countIf(max_step >= ...)` query incorrect. I changed the view to store summed numeric funnel counts (`viewers`, `carters`, `purchasers`) and changed the read query to use `sum(...)`.

## Review Notes
The examples remain schema-dependent and assume columns such as `user_id`, `event_time`, `event_type`, `category`, and `acquisition_source` exist with compatible types. For production-grade materialized funnel analytics, users should also consider insert-block behavior and whether aggregate states or user-level rollups are needed to avoid double counting users whose events arrive across multiple batches.
