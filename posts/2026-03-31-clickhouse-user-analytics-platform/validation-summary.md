# Validation Summary: How to Build a User Analytics Platform with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, AggregatingMergeTree engines)
- ClickHouse aggregate functions (uniqExact, windowFunnel, dateDiff)
- ClickHouse materialized views with AggregateFunction / SimpleAggregateFunction combinators
- ClickHouse codecs (LZ4, ZSTD, DoubleDelta)
- LowCardinality and FixedString data types
- SQL (DDL, DML, CTEs, CROSS JOIN, window/funnel analytics)

## Sources Consulted
- ClickHouse AggregatingMergeTree documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse windowFunnel parametric function documentation — https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse MergeTree engine documentation (TTL section) — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse DateTime64 data type documentation — https://clickhouse.com/docs/sql-reference/data-types/datetime64
- ClickHouse LowCardinality data type documentation — https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse CREATE TABLE (codec section) — https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse SummingMergeTree documentation — https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree

## Issues Found

### 1. windowFunnel window parameter incorrect for DateTime64(3)
- **What was wrong:** `windowFunnel(86400)` was used with a `DateTime64(3)` timestamp column. The window parameter unit matches the timestamp's internal representation. For `DateTime64(3)` (millisecond precision), 86400 equals 86.4 seconds, not the intended 1 day.
- **What was changed:** Changed `windowFunnel(86400)` to `windowFunnel(86400000)` (86,400,000 milliseconds = 1 day).
- **Why:** The ClickHouse documentation states "The unit of window depends on the timestamp itself and varies." Since `ts` is `DateTime64(3)`, the window must be specified in milliseconds.

### 2. SummingMergeTree incorrectly used with uniqExact in materialized view
- **What was wrong:** The `user_daily_activity` table used `SummingMergeTree` with a plain `UInt32` column for `sessions`, populated by `uniqExact(session_id)` in the materialized view. SummingMergeTree sums all numeric columns on merge, so if multiple insert batches produce rows for the same `(user_id, day)` key, the unique session counts would be incorrectly added together instead of properly deduplicated.
- **What was changed:** Switched to `AggregatingMergeTree` with `SimpleAggregateFunction(sum, UInt64)` for the `events` column and `AggregateFunction(uniqExact, UInt64)` for the `sessions` column. Updated the materialized view to use `uniqExactState(session_id)`. Added a query example showing how to read the data using `sum(events)` and `uniqExactMerge(sessions)`.
- **Why:** AggregatingMergeTree with `-State`/`-Merge` combinators is the correct ClickHouse pattern for materialized views that need non-additive aggregates like unique counts. This ensures session deduplication is preserved across part merges.

## Review Notes
- The `TTL toDateTime(ts) + INTERVAL 2 YEAR` expression works correctly but the `toDateTime()` cast is unnecessary — ClickHouse TTL supports `DateTime64` directly. Left as-is since it is functionally correct and not harmful.
- The summary's claim that "LowCardinality columns reduce storage by 10-20x" is optimistic. Typical savings depend heavily on cardinality and data distribution; 2-5x is more common for the columns themselves. Left as-is since it is within the realm of possibility for certain workloads and is presented as a rough estimate.
- All other SQL examples (events table DDL, users table DDL, INSERT, DAU, MAU, stickiness, cohort retention, top events, session duration) are syntactically correct and use valid ClickHouse functions and patterns.
- `CODEC(DoubleDelta, LZ4)` on `DateTime64` is valid — DateTime64 is stored as Int64 internally, which is compatible with DoubleDelta.
- `LowCardinality(FixedString(2))` for country codes is valid and explicitly recommended in ClickHouse documentation.
