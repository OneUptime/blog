# Validation Summary: How to Use accurateCast() and accurateCastOrNull() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse type conversion functions (`accurateCast`, `accurateCastOrNull`, `CAST`, `toInt8`, `toInt32`, `toInt64OrNull`)
- ClickHouse integer types (`Int8`, `Int16`, `Int32`, `Int64`, `UInt8`, `UInt16`)

## Sources Consulted
- ClickHouse type conversion functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse `accurateCast` and `accurateCastOrNull` reference
- ClickHouse `toIntN` family documentation (which describes wrap-around behavior, e.g. `toInt8(128) == -128`)
- ClickHouse `CAST` documentation (which states an exception is raised when the target type cannot represent the value)

## Issues Found
1. **Inaccurate claim about `CAST` silently overflowing.** The intro paragraph and the "Problem" section claimed that `CAST(300 AS Int8)` silently overflows producing an "undefined" result. Per ClickHouse docs, `CAST` actually raises an exception when the source value cannot be represented in the target type — it does not silently overflow. Updated the intro to drop the `CAST()` reference and rewrote the "Problem" section to use only `toInt8`, which does exhibit the silent wrap-around behavior the author wanted to illustrate (e.g., `toInt8(128) == -128`).
2. **Inaccurate `toIntN` overflow description.** The original text described the wrap as producing an "undefined" result. Per docs the wrap is defined behavior (low bits retained), just incorrect for the user's intent. Updated to describe it as silent wrapping rather than undefined, both in the "Problem" section and in the "Comparing accurateCast vs toInt32" section.

## Review Notes
- All `accurateCast` / `accurateCastOrNull` syntax shown in the post (string-literal type name, string-to-int, float-to-int, integer overflow behavior) matches official documentation.
- The truncation behavior of `accurateCast(3.9, 'Int32')` returning `3` is consistent with ClickHouse's general truncation-toward-zero behavior for float-to-integer conversion; the docs do not show this exact example for `accurateCast`, but the behavior is consistent with the broader type conversion semantics.
- Range examples for `Int8` (-128 to 127) and `UInt8` (0 to 255) are correct.
