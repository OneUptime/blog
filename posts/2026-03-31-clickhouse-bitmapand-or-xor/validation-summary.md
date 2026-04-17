# Validation Summary: How to Use bitmapAnd(), bitmapOr(), bitmapXor() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse Bitmap functions (bitmapAnd, bitmapOr, bitmapXor, bitmapBuild, bitmapToArray, bitmapCardinality)
- ClickHouse aggregate combinators (groupBitmapState, groupBitmapMergeState)
- AggregatingMergeTree engine
- AggregateFunction(groupBitmap, UInt32) column type

## Sources Consulted
- ClickHouse official docs: Bitmap Functions (https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions)
- ClickHouse official docs: groupBitmap / groupBitmapAnd aggregate functions
- ClickHouse official docs: Aggregate Function Combinators (-State, -Merge, -MergeState)
- ClickHouse source usage of RoaringBitmap / CRoaring library

## Issues Found
No technical issues found.

All function names, signatures, and return types match official ClickHouse documentation. The set operation results in the examples are mathematically correct:
- AND of {1,2,3,4} and {3,4,5,6} = {3,4}
- OR of {1,2,3,4} and {3,4,5,6} = {1,2,3,4,5,6}
- XOR of {1,2,3,4} and {3,4,5,6} = {1,2,5,6}

The complete working example correctly uses `groupBitmapMergeState` (not `groupBitmapMerge`) because the merged result must remain an AggregateFunction(groupBitmap, ...) state to be passed into `bitmapAnd/Or/Xor`. Using `groupBitmapMerge` would finalize to a UInt64 cardinality and would not work here. This is a non-obvious detail the post gets right.

The `AggregateFunction(groupBitmap, UInt32)` column type, `AggregatingMergeTree` engine, and usage of `groupBitmapState` during insertion are all valid and idiomatic.

## Review Notes
- The claim that ClickHouse's Bitmap type is "a roaring bitmap" is correct in practice (the implementation uses the CRoaring library for larger sets) but is a slight simplification: for very small sets, ClickHouse uses a small-set optimization before switching to RoaringBitmap. This does not affect correctness of any example.
- In the premium_users INSERT, the `WHERE user_id <= 100` filter is redundant (with `numbers(34)` and `number * 3 + 1`, the max user_id is 100), but it is harmless and demonstrates defensive filtering.
- The post does not specify a minimum ClickHouse version; all functions used have been stable in ClickHouse for many years, so no version caveat is needed.
