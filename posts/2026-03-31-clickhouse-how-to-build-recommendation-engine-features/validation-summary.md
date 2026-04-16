# Validation Summary: How to Build Recommendation Engine Features with ClickHouse

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree table engines)
- ClickHouse SQL: `sumState` / `sumMerge` aggregate combinators, materialized views, `groupArray`, CTEs, `FULL OUTER JOIN`, `INTO OUTFILE ... FORMAT JSONEachRow`
- `LowCardinality(String)` encoding
- Collaborative filtering / cosine similarity patterns (domain context)

## Sources Consulted
- ClickHouse GROUP BY docs — https://clickhouse.com/docs/sql-reference/statements/select/group-by
- ClickHouse AggregatingMergeTree engine — https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse JOIN clause (comma = CROSS JOIN, FULL OUTER JOIN semantics) — https://clickhouse.com/docs/sql-reference/statements/select/join
- ClickHouse aggregate function combinators (`-State` / `-Merge`) — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse MergeTree primary-key / ORDER BY reference — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Missing `GROUP BY` when querying the AggregatingMergeTree MV.** The snippet under *"Query the materialized view"* selected `user_id, item_id, sumMerge(total_weight)` with no `GROUP BY`. With bare columns alongside an aggregate, ClickHouse raises `NOT_AN_AGGREGATE`. Added `GROUP BY user_id, item_id` to match the AggregatingMergeTree reading pattern shown in the official docs.

2. **Cosine similarity computation was mathematically incorrect.** The original used CTEs joined via comma (a CROSS JOIN in ClickHouse), then tried `sumIf(a.w*b.w, a.item_id=b.item_id) / (sqrt(sum(a.w*a.w)) * sqrt(sum(b.w*b.w)))`. Over an M×N Cartesian product, `sum(a.w*a.w) = N·Σaᵢ²` and `sum(b.w*b.w) = M·Σbⱼ²`, so the denominator is inflated by `√(M·N)` and the result is wrong. Rewrote the query to use `FULL OUTER JOIN ... USING (item_id)` with `sum(a.w*b.w)` in the numerator (NULLs from non-overlapping items drop out of the sum) and `sum(a.w*a.w)` / `sum(b.w*b.w)` as the proper per-user norms.

3. **Nested aggregate functions in the export query.** `groupArray(sumMerge(total_weight))` wraps one aggregate inside another in a single SELECT, which ClickHouse rejects with `ILLEGAL_AGGREGATION`. Restructured to first compute `sumMerge(...)` in a subquery grouped by `(user_id, item_id)`, then `groupArray` over that result grouped by `user_id`.

## Review Notes
- The `user_item_interactions` schema, MergeTree engine, `LowCardinality(String)` for `event_type`, and the AggregatingMergeTree MV definition are all syntactically valid and idiomatic.
- The item co-occurrence self-join uses `toUnixTimestamp(a.ts) - toUnixTimestamp(b.ts)` inside `abs()`. Since `DateTime` arithmetic already returns seconds, the `toUnixTimestamp` wrapping is redundant but harmless — left as written because it is still correct.
- The co-occurrence query is a self-join without `SETTINGS join_algorithm` tuning. For production-scale interaction tables it may need `hash` / `grace_hash` or a time-bucketing pre-aggregation, but that is a performance caveat, not a correctness issue.
- The cosine-similarity query, even after the fix, materializes both users' item sets client-side via CTE/FULL JOIN. For very dense user profiles a `sumArray`/`arrayReduce` approach over vector columns would be faster, but the corrected form is functionally correct and matches the pedagogical framing.
- The post claims "millisecond" query latency at billions-of-interactions scale in the summary — this is achievable with appropriate `ORDER BY` keys and projections, but is workload-dependent. Not flagged as a correctness issue.
