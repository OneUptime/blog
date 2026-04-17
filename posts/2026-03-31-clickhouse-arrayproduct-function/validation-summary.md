# Validation Summary: How to Use arrayProduct() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL array functions: `arrayProduct`, `arrayFilter`, `arrayMap`, `arrayReduce`, `arraySlice`, `arrayReverse`, `range`
- Scalar/math helpers: `log`, `exp`, `round`

## Sources Consulted
- ClickHouse official documentation — Array Functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions (entries for `arrayProduct`, `arrayFilter`, `arrayMap`, `arrayReduce`, `arraySlice`, `arrayReverse`)
- ClickHouse official documentation — `range` function: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#range
- ClickHouse official documentation — Table engine `Memory`: https://clickhouse.com/docs/en/engines/table-engines/special/memory
- ClickHouse official documentation — `round` function: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions

## Issues Found
- **Incorrect arithmetic for user 3's joint probability.** The comment stated `0.95*0.92*0.88*0.91*0.85 ~= 0.573`, but the actual product is `0.59491432` (~0.595). Updated the comment to `~= 0.595`.
- **Incorrect rounded value for candidate 1's composite score.** The comment stated `0.9*0.85*0.92*0.88 = 0.6196`, but the actual product is `0.619344`, which rounds to `0.6193` at 4 decimals. Updated the comment to `= 0.6193`.

## Review Notes
- The `arrayProduct` signature, return type (Float64), and Float64 casting behavior are correct per ClickHouse docs.
- `range(start, end)` semantics (exclusive end, so `range(1, 6)` = `[1,2,3,4,5]` and `range(1, 11)` = `[1..10]`) are accurate; factorial calculations (5! = 120, 10! = 3628800) check out.
- `arraySlice(arrayReverse(range(1, 11)), 1, 3)` correctly yields `[10, 9, 8]` (falling factorial = 720).
- Log-space equivalence (`exp(sum(log(p)))` = `product(p)`) is mathematically sound; the `arrayReduce('sum', arrayMap(p -> log(p), arr))` form is valid ClickHouse syntax.
- `arrayFilter(p -> p > 0.0, ...)` usage to drop zero sentinels is correct.
- `Memory` table engine usage in examples is appropriate for illustrative INSERTs.
- No deprecated APIs detected. No version-specific caveats.
