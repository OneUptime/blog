# Validation Summary: How to Use bitmapBuild() and bitmapToArray() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse bitmap functions (`bitmapBuild`, `bitmapToArray`, `bitmapCardinality`, `bitmapAnd`, `bitmapAndnot`, `groupBitmapState`)
- ClickHouse array functions (`groupArray`, `arrayJoin`)
- ClickHouse table functions (`numbers`)
- AggregatingMergeTree engine and `AggregateFunction(groupBitmap, T)` state columns

## Sources Consulted
- [ClickHouse Bitmap Functions](https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions) — official documentation for `bitmapBuild` and `bitmapToArray` signatures, return types, and sort behavior.
- [ClickHouse numbers() Table Function](https://clickhouse.com/docs/en/sql-reference/table-functions/numbers) — verified that `numbers(N, M)` returns M integers from N to N+M-1.
- GitHub issues discussing ClickHouse bitmap type strictness (e.g., issue #18713, #6136) — confirmed that bitmap operations require matching inner integer types.

## Issues Found

1. **Off-by-one error in `numbers(1, 11)`** (Building Stored Bitmaps section).
   - `numbers(1, 11)` actually generates 11 values (1..11), but the displayed output listed ids 1..10. Changed to `numbers(1, 10)` so the code matches the shown output of 10 VIP users.

2. **Off-by-one error in `numbers(1, 6)`** (Creating Bitmaps from a Subquery Result section).
   - `numbers(1, 6)` returns 6 values (1..6), but the displayed output was `[1, 2, 3, 4, 5]`. Changed to `numbers(1, 5)` to align the code with the expected output.

3. **Bitmap inner-type mismatch with stored UInt64 bitmap**.
   - The `stored_bitmaps` table is declared as `AggregateFunction(groupBitmap, UInt64)`, but two later examples built ad-hoc bitmaps from `Array(UInt32)` and then combined them with the stored bitmap using `bitmapAnd` / `bitmapAndnot`. ClickHouse requires both bitmap operands to share the same inner type, so these would raise a type-mismatch error. Updated the ad-hoc bitmaps in the "Building an Ad-Hoc Bitmap for a One-Off Operation" and "Filtering an Array Using Bitmap Membership" sections to use `Array(UInt64)` so they are compatible with the stored `UInt64` bitmap.

## Review Notes
- The intro describes `bitmapBuild`'s return type as "Bitmap(UInt32) Roaring Bitmap". The formal type is `AggregateFunction(groupBitmap, T)`; the post's phrasing is informal shorthand that's reasonable for a tutorial. Left unchanged.
- The illustrative output `AggregateFunctionBitmap(...)` for the first query is a placeholder: depending on the client format, ClickHouse may render a bitmap as opaque binary or an empty cell. Kept as an illustrative placeholder consistent with the rest of the series.
- `groupBitmapState` is correctly called out as the preferred alternative for large-scale aggregations instead of `bitmapBuild(groupArray(...))`.
