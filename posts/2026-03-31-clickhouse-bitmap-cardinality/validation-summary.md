# Validation Summary: How to Use bitmapCardinality() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- Roaring Bitmaps (groupBitmap aggregate function)
- Bitmap operations (bitmapAnd, bitmapOr, bitmapXor, bitmapAndnot)
- Bitmap cardinality functions (bitmapCardinality, bitmapAndCardinality, bitmapOrCardinality, bitmapXorCardinality, bitmapAndnotCardinality)
- AggregatingMergeTree engine
- groupBitmapState / groupBitmapOrState aggregate state functions

## Sources Consulted
- ClickHouse Bitmap Functions: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse `numbers` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- ClickHouse `groupBitmap` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found
The post consistently had off-by-one errors in the expected output values. The author appears to have assumed `numbers(N, M)` produces values in the half-open range `[N, M)`, but per ClickHouse's documentation, `numbers(N, M)` produces exactly `M` values starting from `N` (i.e., `N, N+1, ..., N+M-1`).

- `numbers(1, 10000)` → 10000 values (1..10000), not 9999
- `numbers(5001, 8000)` → 8000 values (5001..13000), not 7999
- `numbers(9001, 2000)` → 2000 values (9001..11000), not 1999
- `numbers(15001, 3000)` → 3000 values (15001..18000), not 2999

Resulting corrections in expected outputs:

1. **Basic cardinality table** — Corrected `user_count` column: `9999 → 10000`, `7999 → 8000`, `1999 → 2000`, `2999 → 3000`.
2. **`retained_users`** — Corrected intersection count: `4999 → 5000` (users 5001..10000 is 5000 values).
3. **Dedicated cardinality shortcuts** — Corrected `and_cardinality: 4999 → 5000`, `or_cardinality: 12999 → 13000` (union 1..13000 = 13000 values). The `xor_cardinality` (8000) and `andnot_cardinality` (5000) were already correct because the off-by-one errors cancel out in those formulas.
4. **`total_unique_active` via `groupBitmapOrState`** — Corrected `12999 → 13000`.
5. **Retention table** — Corrected `day1_users: 9999 → 10000`, `day2_users: 7999 → 8000`, `retained: 4999 → 5000`. The `retention_pct` (50.00) remained coincidentally correct since 5000/10000 = 4999/9998 ≈ 50%.

## Review Notes
- Bitmap function names (`bitmapAndCardinality`, `bitmapOrCardinality`, `bitmapXorCardinality`, `bitmapAndnotCardinality`) are spelled correctly per ClickHouse documentation.
- `bitmapCardinality()` directly accepts a stored `AggregateFunction(groupBitmap, UInt64)` column value, which is how it is used throughout the post.
- When reading from an `AggregatingMergeTree` without `FINAL` or a merge-combinator (e.g., `groupBitmapMergeState`), rows may represent unmerged part-states rather than a single fully merged bitmap per key. For small demo inserts this usually works as shown, but in production queries against large tables users should typically wrap the column in `groupBitmapMergeState` inside a `GROUP BY` or use the `FINAL` modifier to guarantee a single merged bitmap per key. This is a nuance worth noting but the examples as written remain valid for the described synthetic data.
- The comparison query at the end (`uniqExact` vs `bitmapCardinality(groupBitmapState(...))`) is valid and both expressions return the same cardinality for the test data.
