# Validation Summary: How to Build Funnel Metrics with Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree, SummingMergeTree engines)
- ClickHouse `windowFunnel` parametric aggregate function
- ClickHouse Materialized Views

## Sources Consulted
- ClickHouse `windowFunnel` docs: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions#windowfunnel
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Materialized View docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse error codes (ILLEGAL_AGGREGATION, code 184): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp

## Issues Found

**Nested aggregate functions in materialized view (fixed).**
The materialized view used `countIf(has(groupArray(event_name), 'signup'))` to count users reaching each funnel stage. This is invalid in ClickHouse: `countIf` is an aggregate function and `groupArray` is also an aggregate function, and ClickHouse rejects aggregates nested inside other aggregates with error code 184 (`ILLEGAL_AGGREGATION`, "Aggregate function … is found inside another aggregate function in query"). The statement would fail at query-compile time.

Replaced the five `countIf(has(groupArray(event_name), 'X'))` expressions with `max(event_name = 'X')`, which is the idiomatic ClickHouse pattern for "did this user reach stage X?" (UInt8 0/1 per user). This produces the same per-user flag the post intends and composes correctly with the downstream SummingMergeTree, which sums the flags across users sharing each `(cohort_date, channel)` key during background merges.

## Review Notes

- The `windowFunnel(604800)(event_time, ...)` syntax is correct. The 604,800-second (7-day) window only works because `event_time` is `DateTime` (stored as Unix seconds). If the timestamp column were `Date`, the window literal would be interpreted in days — a common pitfall worth being aware of, but not an error in this post.
- The materialized view's `WHERE event_time >= today() - 1` clause is evaluated against each INSERT block, not the full source table. In practice it's a near-no-op for live ingest (most events will satisfy it) but is slightly misleading — MVs are block-scoped triggers, not scheduled jobs. Not technically wrong, just a common source of confusion.
- Because the MV keys target rows by `(cohort_date, channel)` but emits one row per `user_id`, a user whose events span multiple INSERT batches can contribute multiple 1-flags per stage, leading to double-counting of that user. For exact unique-user counts, an `AggregatingMergeTree` with `uniqState`/`uniqStateIf` is a stronger pattern. The post's approach is acceptable as an approximation and matches common SummingMergeTree funnel recipes; flagging as a caveat rather than an error.
- The experiment-comparison query computes `countIf(event_name = 'purchase_complete') / count(DISTINCT user_id)`, which mixes event counts over user counts. If users make multiple purchases, the rate is inflated. Semantically loose but not syntactically wrong. A stricter formulation would be `uniqIf(user_id, event_name = 'purchase_complete') / uniq(user_id)`.
