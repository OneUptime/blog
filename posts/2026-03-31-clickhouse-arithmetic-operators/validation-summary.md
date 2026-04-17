# Validation Summary: How to Use Arithmetic Operators in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Arithmetic functions (`+`, `-`, `*`, `/`, `%`, `intDiv`, `modulo`)
- Numeric functions (`pow`, `sqrt`, `abs`)
- Bitwise functions (`bitAnd`, `bitOr`, `bitXor`)
- Null-handling helpers (`if`, `nullIf`)

## Sources Consulted
- [ClickHouse Arithmetic Functions documentation](https://clickhouse.com/docs/sql-reference/functions/arithmetic-functions)
- [ClickHouse intDiv source code](https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/intDiv.cpp)
- ClickHouse documentation for type promotion rules

## Issues Found
- **"Avoiding Division by Zero" example did not match the prose.** The original `nullIf(total_clicks, 0) AS safe_clicks` only nullified zero click counts — it did not guard a denominator as the section intro claimed. Replaced it with `total_clicks / nullIf(total_views, 0) AS ctr_safe`, which correctly demonstrates using `nullIf` to produce `NULL` on division by zero. Added a short explanatory sentence about why the pattern works (`NULL` propagation through arithmetic).

## Review Notes
- Type promotion claims verified against official docs:
  - `1 + 1` → `UInt16` ✓ (UInt8 + UInt8, next bigger type)
  - `1 + 1000000` → `UInt64` ✓ (UInt8 + UInt32, next bigger than widest ≤32-bit operand)
  - `1 / 2` → `Float64` ✓ (division always returns Float64)
  - `intDiv(10, 3)` → `UInt8` ✓ (result preserves dividend width; literal `10` is UInt8)
- `intDiv`, `modulo`, `pow`, `sqrt`, `abs`, `bitAnd`, `bitOr`, `bitXor` are all valid ClickHouse functions.
- `pow(2, 10)` returns `Float64` (1024.0), but displays as `1024` — the inline comment is effectively correct.
- The `hour_bucket` pattern using `intDiv(timestamp, 3600) * 3600` is a well-known idiom and works on Unix timestamps in seconds.
- None.
