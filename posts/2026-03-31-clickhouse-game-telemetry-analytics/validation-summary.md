# Validation Summary: How to Analyze Game Telemetry Data with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views)
- ClickHouse SQL (window functions, aggregate combinators, Map data type, LowCardinality)
- Game analytics / telemetry domain (DAU, retention, K/D ratio, economy sinks/sources, funnels)

## Sources Consulted
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `topK`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/topk
- ClickHouse `uniq` family: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `nullIf` and null functions: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse `Map` data type: https://clickhouse.com/docs/en/sql-reference/data-types/map
- ClickHouse MergeTree / AggregatingMergeTree engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family

## Issues Found
1. **Invalid `countIf(DISTINCT ...)` syntax in retention query.** ClickHouse does not support a `DISTINCT` argument inside `countIf`. Replaced the three `countIf(DISTINCT s.player_id, ...)` calls with `uniqIf(s.player_id, ...)`, and replaced `count(DISTINCT n.player_id)` with `uniq(n.player_id)` for consistency in the same query.
2. **`nullIf(deaths, 1)` in K/D ratio bucketing.** This nulls the divisor only when deaths equals 1, leaving an unprotected division-by-zero when deaths is 0. Changed all five occurrences to `nullIf(deaths, 0)`, which is the standard ClickHouse idiom for safe division.
3. **Non-existent `groupArrayTopK` function in top spenders query.** This function does not exist in ClickHouse. Replaced with the correct `topK(3)(item_category)`.
4. **Nested aggregates in window expression in tutorial funnel query.** The expression `count(DISTINCT player_id) / max(count(DISTINCT player_id)) OVER () * 100` nests aggregates inside another aggregate, which ClickHouse rejects. Rewrote the query to compute `uniq(player_id) AS players_reached` in a subquery, then apply `max(players_reached) OVER ()` in the outer query.

## Review Notes
- The schemas, partitioning strategies, and sort key choices are reasonable for the described workloads.
- `uniq` (HyperLogLog-based, approximate) was used in the rewrites since ClickHouse rewrites `count(DISTINCT x)` to `uniqExact(x)` by default; for very high-cardinality player bases `uniq` is typically the practical choice. If exact counts are required, `uniqExact` / `uniqExactIf` would be the substitute.
- The `topK` function returns approximate top-K results; for exact ranking on small categories, an explicit `arrayMap`/`arraySort` approach over a `groupArray` would be required, but `topK` is the documented and idiomatic substitute here.
- The materialized view section correctly uses `-State` / `-Merge` combinator pairs aligned with `AggregatingMergeTree`.
- `Map(String, String)` access via `context['event_id']` is the correct documented syntax.
