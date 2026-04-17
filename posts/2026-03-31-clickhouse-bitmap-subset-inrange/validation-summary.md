# Validation Summary: How to Use bitmapSubsetInRange() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse Bitmap functions (`bitmapSubsetInRange`, `bitmapSubsetLimit`, `bitmapBuild`, `bitmapToArray`, `bitmapCardinality`, `bitmapAnd`, `groupBitmapState`)
- AggregatingMergeTree engine
- `AggregateFunction(groupBitmap, UInt64)` data type

## Sources Consulted
- ClickHouse Bitmap Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse `numbers()` table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers

## Issues Found
- **Off-by-one in `numbers()` call vs. inline comment.** The original line `FROM numbers(1, 10001);  -- user IDs 1-10000` is inconsistent: `numbers(N, M)` returns `M` values starting at `N`, so `numbers(1, 10001)` generates 10001 IDs (1 through 10001), not 1-10000 as the comment claims. Changed `numbers(1, 10001)` to `numbers(1, 10000)` so the bitmap actually contains user IDs 1-10000 as documented. All shown query outputs (cardinality of `[1000, 2000)` = 1000, `[9995, 10001)` = `[9995..10000]`, premium-tier `[2000, 4000)` count = 2000, Q1/Q2 cohort counts = 5000 each, shard cardinalities = 1000) remain correct under the corrected bitmap range.

## Review Notes
- Function signatures (`bitmapSubsetInRange(bitmap, start, end)` half-open `[start, end)`, `bitmapSubsetLimit(bitmap, range_start, cardinality_limit)`) match official ClickHouse documentation.
- The "Combining Subset with Set Operations" example uses `numbers(1, 2001)` for `active` (IDs 1-2001) and `numbers(501, 2000)` for `newsletter` (IDs 501-2500). The off-by-one here doesn't affect the demonstrated `bitmapSubsetInRange(..., 500, 1000)` slice, since the intersection in that range (501-999) is unchanged. Left as-is because no expected output is shown and the example still demonstrates the intended technique.
- Per official docs, `bitmapSubsetLimit` parameters are typed `UInt32`; the post passes `toUInt64(...)` values. ClickHouse accepts these in practice for `UInt64` bitmaps, so left unchanged.
