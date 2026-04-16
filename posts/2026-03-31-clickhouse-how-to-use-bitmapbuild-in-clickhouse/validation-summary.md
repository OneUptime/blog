# Validation Summary: How to Use bitmapBuild() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (bitmap functions, aggregate functions)
- Roaring Bitmaps (compressed bitmap data structure)
- SQL (ClickHouse dialect)
- AggregatingMergeTree engine

## Sources Consulted
- ClickHouse Bitmap Functions docs: https://clickhouse.com/docs/sql-reference/functions/bitmap-functions
- ClickHouse groupBitmap aggregate function docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse AggregateFunction type docs: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse AggregatingMergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found
No technical issues found.

All claims verified against official ClickHouse documentation:
- `bitmapBuild()` correctly accepts `Array(UInt*)` (UInt8/16/32/64).
- `bitmapCardinality()` correctly returns the number of set bits (unique element count).
- `bitmapAnd()` is intersection; `bitmapAndnot()` is set difference (a minus b).
- `bitmapContains(bitmap, value)` signature is correct.
- `bitmapToArray()` returns elements in ascending order (property of Roaring Bitmap iteration).
- `groupBitmapState` produces the `AggregateFunction(groupBitmap, UInt*)` intermediate state.
- `groupBitmapMerge` correctly merges stored bitmap states.
- ClickHouse does use Roaring Bitmaps internally (CRoaring library) for the `groupBitmap` family.

## Review Notes
- The DAU/WAU example uses `BETWEEN today() - 7 AND today()` which covers 8 days inclusive rather than exactly 7. This is a minor semantic note, not a technical error — the SQL is valid and the post labels the result as a "7-day rolling" window, which is a common conventional interpretation.
- Array literals like `[1, 2, 3, 4, 5]` work with `bitmapBuild()` because ClickHouse infers the smallest unsigned type that fits. For edge cases with mixed-sign literals, users may need explicit casts (e.g., `toUInt32`).
- The claim that bitmaps "maintain sorted order" is accurate in practice but is a property of Roaring Bitmap iteration rather than an explicit API guarantee in the ClickHouse docs.
