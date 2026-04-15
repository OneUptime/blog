# Validation Summary: How to Use ClickHouse in a Medallion Architecture (Bronze/Silver/Gold)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine family, materialized views, JSON functions)
- Medallion Architecture (Bronze/Silver/Gold data layers)
- ClickHouse HTTP interface (curl-based data ingestion)

## Sources Consulted
- ClickHouse JSON Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SimpleAggregateFunction documentation: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse AggregateFunction documentation: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction

## Issues Found

### Issue 1: `JSONExtractString` returns empty string for numeric JSON values
- **Location**: Silver layer materialized view — `toUInt64OrZero(JSONExtractString(raw_data, 'user_id'))` 
- **Problem**: The curl example inserts `user_id` as a JSON number (`"user_id":42`), but `JSONExtractString` returns an empty string for non-string JSON values. This means `toUInt64OrZero("")` would always return `0`, silently losing the user_id.
- **Fix**: Changed to `JSONExtractUInt(raw_data, 'user_id')`, which correctly extracts numeric values and returns a UInt64 directly.

### Issue 2: `SummingMergeTree` with non-additive `countDistinct` aggregates
- **Location**: Gold layer table definition and materialized view
- **Problem**: `SummingMergeTree` sums numeric columns when merging rows with the same ORDER BY key. The `sessions` and `distinct_types` columns were populated with `countDistinct()` results, which are **not additive**. When data arrives across multiple insert batches for the same `(activity_date, user_id)`, summing distinct counts produces incorrect results. For example, if batch 1 sees sessions {A, B} (count=2) and batch 2 sees sessions {B, C} (count=2), SummingMergeTree would produce 4 instead of the correct value of 3.
- **Fix**: Changed the engine to `AggregatingMergeTree()` with proper aggregate function types:
  - `sessions` and `distinct_types` columns changed to `AggregateFunction(uniq, String)`, populated with `uniqState()` in the MV
  - `events` column changed to `SimpleAggregateFunction(sum, UInt64)` to correctly sum additive counts during merges
  - Updated the Gold layer query to use `uniqMerge(sessions)` instead of `sum(sessions)`

## Review Notes
- The `ReplacingMergeTree` used for the Silver layer deduplicates by the ORDER BY key `(user_id, event_time)`. This means events for the same user at the exact same timestamp would be deduplicated, which is a reasonable choice but worth noting — if sub-second precision is needed, consider using `DateTime64` instead of `DateTime`.
- The backfill section uses pseudocode (`SELECT ...`) which is appropriate for illustrating the concept, but readers will need to replicate the full Silver MV SELECT logic for actual backfills.
