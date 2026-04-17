# Validation Summary: How to Use bitmapXor() and bitmapAndnot() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- ClickHouse bitmap functions (`bitmapXor`, `bitmapAndnot`, `bitmapAnd`, `bitmapOr`, `bitmapCardinality`, `bitmapToArray`, `bitmapAndnotCardinality`, `bitmapXorCardinality`, `groupBitmapState`)
- AggregatingMergeTree engine
- AggregateFunction(groupBitmap, UInt64) data type

## Sources Consulted
- ClickHouse official docs — Bitmap functions: https://clickhouse.com/docs/en/sql-reference/functions/bitmap-functions
- ClickHouse official docs — `numbers` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers
- ClickHouse official docs — AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse official docs — `groupBitmap` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitmap

## Issues Found
No technical issues found.

Verification of cardinality arithmetic:
- `numbers(N, M)` generates `M` consecutive integers starting at `N`. So `numbers(1, 600)` = IDs 1-600 and `numbers(401, 500)` = IDs 401-900 — comment "Cohort B: users 401-900" is correct.
- cohort_a ∖ cohort_b = {1..400} → cardinality 400 ✓
- cohort_b ∖ cohort_a = {601..900} → cardinality 300 ✓
- cohort_a XOR cohort_b → cardinality 700 ✓
- newsletter ∩ mobile_app ∖ paid_plan: numbers(1,500)∩numbers(251,500)∖numbers(401,400) = {251..400} → 150 (not asserted in post but the example is internally consistent).
- Symmetric difference identity `XOR(a, b) = OR(a, b) ANDNOT AND(a, b)` is mathematically correct.

All function names and signatures match current ClickHouse documentation. The `AggregateFunction(groupBitmap, UInt64)` column type and `AggregatingMergeTree` usage are correct.

## Review Notes
- The scalar subqueries `(SELECT user_bitmap FROM cohort_bitmaps WHERE cohort = 'cohort_a')` rely on each cohort having exactly one row in the table. Because the second `INSERT` (in the "Combining andnot with and/or" section) writes new cohorts to the same table without re-inserting the originals, this assumption holds. If a reader were to repeat any `INSERT` for an existing cohort, the scalar subquery would error on multiple rows; in that scenario a `groupBitmapMergeState(user_bitmap)` aggregation would be required. This is a reasonable simplification for a tutorial and not an error.
- `bitmapAndnotCardinality` and `bitmapXorCardinality` are correctly described as cardinality-only shortcuts that avoid materializing the result bitmap, matching the official documentation.
