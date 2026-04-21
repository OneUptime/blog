# Validation Summary: How to Use bitmapToArray() in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse bitmap functions
- ClickHouse `groupBitmap` aggregate states
- ClickHouse `AggregatingMergeTree`
- ClickHouse array functions and `ARRAY JOIN`

## Sources Consulted
- ClickHouse official documentation on bitmap functions: https://clickhouse.com/docs/sql-reference/functions/bitmap-functions
- ClickHouse official documentation on `groupBitmap`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse official documentation on `groupBitmapOr`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupbitmapor
- ClickHouse official documentation on aggregate function combinators (`-State`, `-Merge`, `-MergeState`): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation on `AggregatingMergeTree`: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse official documentation on array functions: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse official documentation on the `ARRAY JOIN` clause: https://clickhouse.com/docs/sql-reference/statements/select/array-join

## Issues Found
1. **Incorrect return type wording.** The post said `bitmapToArray()` returns `Array(UInt64)`. ClickHouse documents the return type as `Array(UInt*)`, with the exact unsigned integer type matching the bitmap. Updated the Overview and Summary to describe the result as an array of unsigned integers instead of always `Array(UInt64)`.

2. **Incorrect aggregate-state merge function in conversion examples.** The post used `groupBitmapMerge(...)` as input to `bitmapToArray(...)`. For `groupBitmap`, the `-Merge` combinator returns the final cardinality, while `bitmapToArray()` expects a bitmap state. Updated the stored-bitmap examples to use `groupBitmapMergeState(...)`, which merges the states and keeps the result as a bitmap object.

3. **Incorrect aggregate-state merge function in the cardinality example.** The performance example used `bitmapCardinality(groupBitmapMerge(active_users))`, which would pass a `UInt64` cardinality into `bitmapCardinality()`. Updated it to `bitmapCardinality(groupBitmapMergeState(active_users))`.

## Review Notes
The remaining bitmap function examples (`bitmapBuild`, `bitmapAnd`, `bitmapAndnot`, `bitmapCardinality`, `arraySlice`, negative array indexing, and `ARRAY JOIN ... AS`) match the current ClickHouse documentation. For aggregate-state columns, `groupBitmapMerge(column)` is also a valid direct way to return merged cardinality; the post now keeps `groupBitmapMergeState(column)` where a bitmap object is needed.
