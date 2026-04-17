# Validation Summary: How to Use bitRotateLeft() and bitRotateRight() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse bitwise functions (`bitRotateLeft`, `bitRotateRight`, `bitShiftLeft`, `bitXor`)
- ClickHouse aggregate functions (`groupBitXor`)
- ClickHouse type conversion functions (`toUInt8`, `toUInt16`, `toUInt32`, `toUInt64`, `toDate`)

## Sources Consulted
- ClickHouse Bit Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/bit-functions
- ClickHouse SQL Syntax documentation (numeric literals): https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse `groupBitXor` aggregate reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitxor
- PR #43785 (SQL standard hex/binary string literals): https://github.com/ClickHouse/ClickHouse/pull/43785
- General references on hash algorithm internals (djb2, FNV, MurmurHash, xxHash, SipHash, SHA-1) to verify which actually use bit rotation

## Issues Found
1. **Incorrect hash algorithm examples.** The post claimed "Bernstein, FNV, Murmur" as examples of hash algorithms that use bit rotation. djb2 (Bernstein) uses `hash * 33 + c` (shift-and-add) and FNV uses multiply-then-XOR — neither uses bit rotation. Changed the list to "MurmurHash, xxHash, SipHash, and SHA-1", all of which genuinely rely on bit rotations for diffusion.
2. **Overly narrow input type list.** The post listed only `UInt8/16/32/64` as supported input types. ClickHouse's `bitRotateLeft`/`bitRotateRight` also accept signed `Int8/16/32/64`. Updated the description to "Int8/16/32/64 or UInt8/16/32/64".

## Review Notes
- Verified the binary-literal arithmetic in all examples:
  - `bitRotateLeft(toUInt8(0b00001111), 2)` → `0b00111100` = 60 ✓
  - `bitRotateRight(toUInt8(0b00001111), 2)` → `0b11000011` = 195 ✓
  - `bitShiftLeft(toUInt8(192), 2)` → 0 (overflow bits dropped, result clamped to UInt8) ✓
  - `bitRotateLeft(toUInt8(192), 2)` → `0b00000011` = 3 ✓
  - `bitRotateLeft(toUInt16(1), 15)` → 32768 ✓
  - `bitRotateLeft(toUInt32(1), 31)` → 2147483648 ✓
- Confirmed ClickHouse supports `0b` binary literals (and `0x` hex) in SQL per the official syntax docs.
- `bitShiftLeft` returning a value of the same type as `a` (so UInt8 overflow is dropped) is documented behavior.
- UInt128/UInt256 and Int128/Int256 are not listed as supported arguments for these rotate functions; the post correctly avoids them.
- All function names (`bitRotateLeft`, `bitRotateRight`, `bitShiftLeft`, `bitXor`, `groupBitXor`, `toUInt*`, `toDate`) are current and non-deprecated as of 2026-04.
