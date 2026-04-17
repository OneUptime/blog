# Validation Summary: How to Use bitmapCardinality() and bitmapContains() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse Bitmap functions (`bitmapCardinality`, `bitmapContains`, `bitmapBuild`, `bitmapAnd`, `bitmapOr`)
- ClickHouse aggregate functions (`groupBitmapState`, `groupBitmapMergeState`)
- AggregatingMergeTree engine

## Sources Consulted
- ClickHouse Bitmap Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse groupBitmap aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse AggregateFunction data type: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found
No technical issues found.

Verified points:
- `bitmapCardinality(bitmap)` correctly described as returning a `UInt64` count of unique unsigned integers in the bitmap.
- `bitmapContains(bitmap, value)` correctly described as returning `1`/`0` for membership tests.
- All example outputs computed correctly:
  - `bitmapBuild([1, 2, 3, 4, 5, 100, 200, 300])` → cardinality 8.
  - Intersection of `{1,2,3,4,5}` and `{4,5,6,7,8}` = `{4,5}` → cardinality 2.
  - Union of the same sets = `{1,2,3,4,5,6,7,8}` → cardinality 8.
  - Allowlist filter correctly returns users 1001, 1002, 1005, 1009, 1012 from `numbers(15) + 1000`.
  - Complete working example DAU counts (1000, 1000, 800) match the `numbers()` ranges used in each INSERT.
- `AggregateFunction(groupBitmap, UInt32)` column type is valid for AggregatingMergeTree.
- Usage of `groupBitmapState` for state aggregation and `groupBitmapMergeState` for retrieving the merged bitmap state is correct.
- Mermaid diagram accurately reflects the function behaviors.

## Review Notes
- The examples build bitmaps inline via `bitmapBuild([...])`, which is fine for demonstrating the functions. In practice, `bitmapBuild` requires an array of unsigned integers; readers using signed integer columns may need an explicit cast (e.g., `bitmapBuild(groupArray(toUInt32(col)))`), though this isn't required for the literal-array examples shown.
- In the Complete Working Example, each `INSERT ... GROUP BY` produces a single row per date, so `groupBitmapMergeState` in the final query is effectively merging a single state per group. This still works as a valid demonstration and matches typical real-world usage where multiple partial states accumulate per date.
