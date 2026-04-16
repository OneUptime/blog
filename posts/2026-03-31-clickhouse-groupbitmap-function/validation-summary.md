# Validation Summary: How to Use groupBitmap() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- Roaring Bitmaps
- `groupBitmap` aggregate function and its `-State` / `-Merge` combinator variants
- Bitmap scalar functions (`bitmapCardinality`, `bitmapAnd`, `bitmapOr`, `bitmapAndnot`, `bitmapXor`, `bitmapToArray`)
- `AggregatingMergeTree` table engine

## Sources Consulted
- ClickHouse docs — `groupBitmap` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitmap
- ClickHouse docs — Bitmap functions: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse docs — Aggregate function combinators (`-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse source test suite — `tests/queries/0_stateless/00829_bitmap_function.sql` on GitHub

## Issues Found

1. **Incorrect return type assumption for `groupBitmap()`** — The post repeatedly treated `groupBitmap(col)` as if it returned a bitmap, but per the ClickHouse docs it returns a `UInt64` cardinality count. The bitmap value is produced by the `-State` combinator (`groupBitmapState(col)`).
   - Fixed the opening paragraph to describe `groupBitmap()` accurately and introduce `groupBitmapState()` as the bitmap-producing variant.
   - Fixed the "Syntax and Storage Type" section: renamed the alias/comment of the first query and added a separate `groupBitmapState(user_id) AS bm` example so the bitmap-producing query is shown correctly.
   - Fixed the "Building a Bitmap and Counting Cardinality" section: removed the incorrect `bitmapCardinality(groupBitmap(...))` wrapping (which would have been a type error — `bitmapCardinality` expects a bitmap, not a `UInt64`) and used `groupBitmap(user_id)` directly, with explanatory text updated accordingly.
   - Fixed the three "Bitmap Set Operations" subqueries (`bitmapAnd`, `bitmapOr`, `bitmapAndnot`) to feed them `groupBitmapState(user_id)` instead of `groupBitmap(user_id)`, and added a lead-in sentence explaining why.
   - Fixed the "Converting a Bitmap Back to an Array" query to use `groupBitmapState(user_id)` inside the subquery given to `bitmapToArray`.

## Review Notes

- All bitmap function names used in the post (`bitmapCardinality`, `bitmapAnd`, `bitmapOr`, `bitmapAndnot`, `bitmapXor`, `bitmapToArray`) are valid and correctly camelCased per current ClickHouse docs.
- The `AggregatingMergeTree` + `groupBitmapState` / `groupBitmapMerge` pattern is correctly described; `groupBitmapMerge` does return a bitmap value, so the pre-aggregation and retention examples needed no structural changes.
- The claim that `groupBitmap` does not accept signed integers is accurate — the docs specify `UInt*` expressions only.
- Future improvement (not fixed since it is not technically wrong): ClickHouse also provides combined-cardinality helpers (`bitmapAndCardinality`, `bitmapOrCardinality`, `bitmapAndnotCardinality`, `bitmapXorCardinality`) that avoid the explicit `bitmapCardinality(bitmapAnd(...))` pattern and are typically slightly more efficient; these could be mentioned in a follow-up revision.
