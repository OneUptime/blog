# Validation Summary: How to Use arrayRotateLeft() and arrayRotateRight() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse array functions: `arrayRotateLeft`, `arrayRotateRight`, `arrayShiftLeft`, `arrayShiftRight`, `arrayPopBack`, `arrayPushBack`, `arrayConcat`, `arraySlice`, `arrayMap`
- ClickHouse date functions: `toDayOfWeek`, `today`

## Sources Consulted
- ClickHouse Array Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse docs for `arrayRotateLeft` / `arrayRotateRight` signatures, argument types [(U)Int8/16/32/64], and negative-value handling
- ClickHouse docs for `arrayShiftLeft` / `arrayShiftRight` (contrast with rotation)
- ClickHouse docs for `toDayOfWeek` (Monday=1 … Sunday=7)

## Issues Found
- **Nonexistent function `arrayReplace`**: The "Circular Buffer Simulation" section used `arrayReplace(arr, 5, 99)` to replace the element at position 5. `arrayReplace` is not a function in ClickHouse (verified against the full array-functions reference; closest matches are `arrayFilter` / `arrayMap` / `arrayRemove`, none of which do index-based replacement). Fixed by replacing with `arrayPushBack(arrayPopBack(...), 99)`, which produces the same result (replace the last element with 99) using real ClickHouse functions. The surrounding prose mention of "`arrayResize` and direct element replacement" was updated to reference the actually-used functions (`arrayPopBack`, `arrayPushBack`) to match the new code.

## Review Notes
- Rotation semantics and sample outputs in the Basic Usage and Rotating-by-Array-Length sections match ClickHouse's documented behavior.
- The equivalence claim `arrayRotateLeft(arr, -n)` ≡ `arrayRotateRight(arr, n)` is consistent with the official docs, which state negative `n` is treated as rotation in the opposite direction by `|n|`.
- The "Large Rotations with Modulo" section relies on ClickHouse wrapping rotations that exceed the array length. The public docs do not explicitly document this, but it is the standard and expected behavior of rotation; the explicit-modulo form shown in the example is a safe fallback regardless.
- `toDayOfWeek` Monday=1 … Sunday=7 convention used in the Day-of-Week example matches the ClickHouse documentation.
- The post correctly distinguishes rotation (no loss) from `arrayShiftLeft`/`arrayShiftRight` (lossy, fills with defaults).
