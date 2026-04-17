# Validation Summary: How to Use bitmapContains() and bitmapHasAny() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse bitmap functions (`bitmapContains`, `bitmapHasAny`, `bitmapHasAll`, `bitmapAndCardinality`, `bitmapCardinality`, `bitmapBuild`)
- ClickHouse aggregate functions (`groupBitmapState`)
- AggregatingMergeTree engine
- `numbers()` table function
- Roaring Bitmaps

## Sources Consulted
- ClickHouse Bitmap Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse `numbers()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- ClickHouse `groupBitmap` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse source: `src/Functions/FunctionsBitmap.h` (FunctionBitmapContains / FunctionBitmapCardinality type-check paths)
- ClickHouse source: `src/AggregateFunctions/AggregateFunctionGroupBitmapData.h` (`rb_intersect` vs `rb_and_cardinality` implementations)

## Issues Found

Three technical issues were found and fixed:

1. **Incorrect element-range comment in sample data** — The comment `-- admins: 1-49` for `numbers(1, 50)` was off-by-one. `numbers(N, M)` returns M values starting at N (so `numbers(1, 50)` yields values 1..50, not 1..49). Fixed to `admins: 1-50`. The downstream examples (user 25 admin lookup, user 300 not-admin, user 75 editor-only, admin∩viewer disjoint) are all still consistent with the corrected range.

2. **Type mismatch in `bitmapHasAll` example** — The original code was:
   ```sql
   bitmapHasAll(
       (SELECT user_bitmap FROM permission_bitmaps WHERE role = 'editor'),  -- UInt64 bitmap
       bitmapBuild(CAST([50, 60, 70, 80], 'Array(UInt32)'))                  -- UInt32 bitmap
   )
   ```
   `bitmapHasAll` (and `bitmapHasAny`) require both bitmaps to share the same nested element type; ClickHouse enforces this in `FunctionBitmapCardinality::getReturnTypeImpl` and will throw `ILLEGAL_TYPE_OF_ARGUMENT` ("The nested type in bitmaps must be the same"). Changed `Array(UInt32)` to `Array(UInt64)` so both bitmaps are UInt64. Also updated the preceding code comment which incorrectly described the test set as "users 1-10" when the actual IDs used are `[50, 60, 70, 80]`.

3. **Overly restrictive needle-type claim in the intro** — The opening paragraph stated `bitmapContains(bitmap, needle)` "returns `1` if the `UInt32` value `needle` exists". Per the ClickHouse source, `bitmapContains` internally casts the needle to `UInt64` via `castColumn(..., DataTypeUInt64)` and accepts any native integer type. Also, the sample data in this post builds a `UInt64` bitmap, so stating the needle is specifically `UInt32` is misleading. Changed to "unsigned integer value".

## Review Notes
- `bitmapContains` calls in the post use `toUInt32(...)` against a bitmap of type `AggregateFunction(groupBitmap, UInt64)`. Verified this works: ClickHouse explicitly casts the needle column to `UInt64` inside `FunctionBitmapContains::executeIntType`, so mixing `UInt32` needle with a `UInt64` bitmap is safe. Matching the needle type to the bitmap element type (i.e., `toUInt64(...)`) would be slightly more idiomatic, but the current form is not a bug.
- The short-circuit claim for `bitmapHasAny` vs `bitmapAndCardinality` is directionally correct. In ClickHouse's `rb_intersect` (small-set or mixed small/large branches), an early `return 1` fires on the first shared element, whereas `rb_and_cardinality` always iterates. In the large×large branch, `rb_intersect` still computes `(a & b).cardinality() > 0` and the short-circuit advantage is smaller — worth keeping in mind, but the post's general performance guidance is fine.
- The note "each row test is O(log n) on the compressed bitmap" is a reasonable simplification for a Roaring Bitmap lookup. True per-container cost can vary (bitmap containers are O(1), array/run containers are O(log n)), so this is good enough for a tutorial.
- The post uses `groupBitmapState` (not `groupBitmapMergeState` or an explicit `-Merge`) when inserting into the AggregatingMergeTree — this is correct because each role's rows are being aggregated once in the INSERT itself, producing a single state per role.
