# Validation Summary: How to Use groupBitmap() Aggregate Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL analytics database)
- ClickHouse `groupBitmap`, `groupBitmapState`, `groupBitmapMerge` aggregate functions
- ClickHouse `groupBitmapOr`, `groupBitmapAnd`, and their `-State` combinators
- ClickHouse bitmap functions (`bitmapCardinality`, `bitmapToArray`, `bitmapAndCardinality`)
- `AggregatingMergeTree` table engine
- `AggregateFunction(groupBitmap, UInt64)` data type
- Materialized views with `TO` clause
- Roaring Bitmap data structure

## Sources Consulted
- ClickHouse official docs — aggregate function reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse docs — `groupBitmapOr`, `groupBitmapAnd`, `groupBitmapXor` reference
- ClickHouse docs — bitmap functions: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse docs — `AggregatingMergeTree` engine
- ClickHouse docs — `CREATE MATERIALIZED VIEW` syntax
- ClickHouse docs — `numbers()` table function
- ClickHouse docs — DateTime arithmetic and array indexing (1-based)

## Issues Found
No technical issues found.

All claims were verified:
- `groupBitmap(col)` accepts unsigned integer columns, returns UInt64 cardinality, and uses Roaring Bitmap internally.
- `groupBitmapState(col)` produces `AggregateFunction(groupBitmap, T)` state storable in `AggregatingMergeTree`.
- `groupBitmapMerge(state)` correctly merges states and returns cardinality.
- `groupBitmapOrState` / `groupBitmapAndState` exist and return bitmap states compatible with `bitmapCardinality`, `bitmapToArray`, and `bitmapAndCardinality`.
- Scalar subquery syntax in the `WITH` clause is valid and works with bitmap aggregate results.
- DateTime minus unsigned integer is valid (interpreted as seconds).
- ClickHouse arrays are 1-indexed, so `[1 + (rand() % 3)]` yields a valid index.
- `numbers(1000000)` is a valid table function.
- Materialized view `CREATE MATERIALIZED VIEW ... TO target AS SELECT ...` syntax is correct.

## Review Notes
- The `toUInt64(user_id)` cast in the basic example is redundant since `user_id` is already declared `UInt64` in the schema, but it is not incorrect and is defensive for readers who might have a different column type.
- The claim that `groupBitmap` is "equivalent to `uniqExact`" is true for unsigned integer inputs; readers should note `uniqExact` accepts any type while `groupBitmap` requires unsigned integers.
- The "Partial Aggregation" section references a `weekly_partial_states` table that is not created in the post — this is illustrative of the pattern rather than a runnable example, which is acceptable for a reference guide.
- `bitmapToArray` on large bitmaps can be memory-intensive; the post already flags this inline.
