# Validation Summary: How to Use Int128, Int256, UInt128, UInt256 in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (Int128, Int256, UInt128, UInt256 data types)
- ClickHouse SQL (DDL, type casts, arithmetic, bit operations, system tables)
- MergeTree engine
- UUID functions and reinterpret casts
- Blockchain/Ethereum data modeling examples

## Sources Consulted
- ClickHouse integer types: https://clickhouse.com/docs/sql-reference/data-types/int-uint
- ClickHouse type conversion functions (`toUInt256`, `toInt128`, etc.): https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse UUID functions (`UUIDStringToNum`, `UUIDToNum`): https://clickhouse.com/docs/sql-reference/functions/uuid-functions
- ClickHouse `system.parts_columns`: https://clickhouse.com/docs/operations/system-tables/parts_columns
- ClickHouse reinterpret functions: https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions#reinterpretasuint128

## Issues Found
1. **Non-existent `UInt160` type in `CREATE TABLE blockchain_transactions`.** ClickHouse only supports UInt8/16/32/64/128/256 — there is no UInt160. The original schema declared `from_address UInt160` while the inline comment ironically said "use UInt256 for compatibility". Fixed by changing the column type to `UInt256` and updating the comment to explain that Ethereum addresses are 160-bit but stored in UInt256 because UInt160 doesn't exist.
2. **Hex string passed to `toUInt256()`.** The official docs explicitly list "String representations of binary and hexadecimal values, e.g. `SELECT toUInt256('0xc0fe');`" as **unsupported arguments** — `toUInt256` only accepts decimal numeric strings. The post's `bitAnd(tx_hash, toUInt256('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'))` would fail at runtime. Fixed by replacing the hex literal with the equivalent decimal string `'1461501637330902918203684832716283019655932542975'` (= 2^160 − 1).
3. **Slight imprecision in `UInt256` max value.** Table listed `1.2 x 10^77`; the actual max (2^256 − 1) is closer to `1.16 x 10^77`. Updated for accuracy.

## Review Notes
- The `UUIDStringToNum` → `reinterpretAsUInt128` example works, but readers should be aware that `UUIDStringToNum` returns big-endian bytes (variant=1 default) while `reinterpretAsUInt128` reads little-endian, so the resulting UInt128 will not numerically equal the UUID's hex value read left-to-right. ClickHouse also offers `UUIDToNum(uuid)` as a more direct alternative when starting from a `UUID`-typed value. Left as-is since the example is technically valid and matches a common reinterpretation pattern.
- The "2-4x slower than 64-bit arithmetic" claim is directionally correct (x86-64 has no native 128/256-bit scalar integer instructions, so wide arithmetic is emulated via chained 64-bit ops) but the specific multiplier is not stated in official ClickHouse documentation. It is a reasonable rule-of-thumb; left as-is since the surrounding caveats (vectorization, storage, compression) are accurate.
- All value ranges, `system.parts_columns` reference, `toInt128(9999999999999999999)` literal handling, and arithmetic/promotion behavior were verified and are correct.
