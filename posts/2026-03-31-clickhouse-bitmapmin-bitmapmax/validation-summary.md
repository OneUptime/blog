# Validation Summary: How to Use bitmapMin() and bitmapMax() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse Bitmap functions (`bitmapMin`, `bitmapMax`, `bitmapBuild`, `bitmapCardinality`, `groupBitmapState`)
- Roaring Bitmaps

## Sources Consulted
- [ClickHouse Bitmap Functions documentation](https://clickhouse.com/docs/sql-reference/functions/bitmap-functions)
- [ClickHouse PR #78444 - fix: bitmapMin return UINT32_MAX when the bitmap is empty](https://github.com/ClickHouse/ClickHouse/pull/78444)
- [ClickHouse Issue #78353 - bitmapMin with empty bitmap](https://github.com/ClickHouse/ClickHouse/issues/78353)
- [ClickHouse source: FunctionsBitmap.h](https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/FunctionsBitmap.h)

## Issues Found
1. **Incorrect empty-bitmap return value for `bitmapMin()`**: The post stated that `bitmapMin()` on an empty bitmap returns "the maximum UInt64 value". According to ClickHouse documentation and source, `bitmapMin()` returns `UINT32_MAX` (4294967295) for standard bitmaps (built from `UInt8`/`UInt16`/`UInt32` values) and only returns `UINT64_MAX` for bitmaps built from `UInt64` values. The return type is `UInt64` in both cases. Updated the text to accurately describe this behavior.

2. **Overly narrow claim about bitmap element type**: The introduction stated "ClickHouse roaring bitmaps store sets of UInt32 integers." ClickHouse roaring bitmaps actually accept any unsigned integer type (`UInt8`, `UInt16`, `UInt32`, `UInt64`). Broadened the statement to reflect the supported types, while noting that `UInt32` is the typical case shown in the examples.

## Review Notes
- All SQL examples are syntactically correct and use current, non-deprecated APIs.
- `bitmapMin`/`bitmapMax` applied directly to a `groupBitmapState(...)` aggregate state is valid and returns the min/max of the aggregated bitmap.
- The guard recommendation (`bitmapCardinality() > 0` before interpreting min/max) remains good advice, especially given the UINT32_MAX sentinel for empty bitmaps in `bitmapMin`.
- Historical note: prior to the fix merged via PR #78444 (March 2025), `bitmapMin()` incorrectly returned `0` on empty bitmaps. Modern ClickHouse versions behave as documented and as described in the updated post.
