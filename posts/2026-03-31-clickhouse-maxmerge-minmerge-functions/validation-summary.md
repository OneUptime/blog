# Validation Summary: How to Use maxMerge() and minMerge() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- AggregatingMergeTree engine
- Materialized Views
- Aggregate function combinators (-State, -Merge, -MergeState)

## Sources Consulted
- [ClickHouse Aggregate Function Combinators documentation](https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators)
- [ClickHouse AggregateFunction data type documentation](https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction)
- [ClickHouse AggregatingMergeTree engine documentation](https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree)
- [Altinity Knowledge Base: -State and -Merge combinators](https://kb.altinity.com/altinity-kb-queries-and-syntax/state-and-merge-combinators/)

## Issues Found
1. **Invalid nested aggregate functions in "Multi-Level Rollup Chains" section**: The original example showed `maxMerge(maxState(latency))` and `maxMerge(maxMergeState(max_latency))` as single-query expressions. In ClickHouse, nesting aggregate functions within other aggregate functions in the same SELECT is not allowed and produces an `ILLEGAL_AGGREGATION` error. Fixed by rewriting the example to show the correct equivalence: `max(latency)` on raw data vs. `maxMerge(max_latency)` on pre-aggregated data, and added a clear illustration of how `maxMergeState()` is used in the INSERT step (not nested in the query).

## Review Notes
- `AggregateFunction(count, UInt64)` in the `sla_summary` table definition is technically valid if the corresponding `countState()` call is passed a UInt64 expression (i.e., `countState(some_uint64_column)`). However, the more common pattern for counting rows is `AggregateFunction(count)` with `countState()` (no arguments). Since the blog does not show the populating MV/INSERT for this table, the current definition is acceptable but readers should be aware of the distinction.
- All other SQL syntax (CREATE TABLE, materialized view definitions, -State/-Merge/-MergeState combinator usage, parametric function syntax with `quantile(0.95)`) is correct and follows ClickHouse best practices.
- The mermaid diagram accurately represents the two-phase aggregation pattern.
