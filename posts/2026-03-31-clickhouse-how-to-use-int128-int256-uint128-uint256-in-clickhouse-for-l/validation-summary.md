# Validation Summary: How to Use Int128, Int256, UInt128, UInt256 in ClickHouse for Large Numbers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Int128, UInt128, Int256, UInt256 extended integer types)
- SQL (CREATE TABLE, INSERT, SELECT, GROUP BY)
- MergeTree table engine
- Type conversion functions (toUInt128, toInt128, toUInt256, toInt256, toUInt128OrZero, toUInt128OrNull)
- reinterpretAsUInt256, hex/unhex, formatReadableQuantity functions
- Blockchain/Ethereum data modeling (wei, ERC-20, SHA-256 hashes)

## Sources Consulted
- ClickHouse official documentation: Data Types - Int128, Int256, UInt128, UInt256 (https://clickhouse.com/docs/en/sql-reference/data-types/int-uint)
- ClickHouse Type Conversion Functions (https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions)
- ClickHouse Encoding Functions: hex/unhex/reinterpretAs (https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions)
- ClickHouse Other Functions: formatReadableQuantity (https://clickhouse.com/docs/en/sql-reference/functions/other-functions)
- ClickHouse MergeTree engine documentation (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- Verified type ranges arithmetically (2^127, 2^128, 2^255, 2^256)

## Issues Found
1. **UInt128 literal overflow (fixed)**: Line 44 contained `toUInt128('999999999999999999999999999999999999999')` — that string had 39 nines (10^39 - 1), which exceeds UInt128's maximum value of 340282366920938463463374607431768211455 (~3.4 × 10^38). Reduced to 38 nines (`'99999999999999999999999999999999999999'`) so the literal fits within UInt128 range and the INSERT will succeed instead of erroring on overflow.

## Review Notes
- The advertised type ranges in the comparison table are correct: Int128 ≈ ±1.7×10^38, UInt128 ≈ 3.4×10^38, Int256 ≈ ±5.8×10^76, UInt256 ≈ 1.16×10^77.
- The direct INSERT literals (UInt128 max 340282366920938463463374607431768211455, Int256 min -57896044618658097711785492504343953926634992332820282019728792003956564819968, the 77-digit UInt256 value) all verify correctly against 2^128 - 1 and -2^255.
- The `reinterpretAsUInt256(unhex('a' || repeat('0', 63)))` example is technically valid SQL but, due to little-endian byte interpretation, evaluates to 160 rather than the more intuitive 0xa00...0 value. It demonstrates the function call but readers expecting a "natural" hex-to-integer conversion should reverse() the bytes first or use a different approach. Left as-is since it is not technically incorrect.
- Casting UInt256 sums to Float64 via `toFloat64(sum(value_wei)) / 1e18` will lose precision for very large totals; acceptable for human-readable display but worth noting for analytical use.
- Performance claim "~2-5x slower" for 128-bit vs 64-bit aggregation is a reasonable rough estimate; actual ratio varies by workload and ClickHouse version.
- ClickHouse parses unquoted large integer literals (e.g., `-500000000000000000000` in the arithmetic example) as UInt64/Int64/UInt128/Int128/UInt256/Int256 in order — this works in modern ClickHouse versions (21.7+).
