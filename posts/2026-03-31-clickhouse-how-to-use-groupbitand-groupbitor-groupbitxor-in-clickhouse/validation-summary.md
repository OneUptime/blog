# Validation Summary: How to Use groupBitAnd(), groupBitOr(), groupBitXor() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL aggregate functions (`groupBitAnd`, `groupBitOr`, `groupBitXor`)
- ClickHouse bit functions (`bitTest`, `bin`)
- ClickHouse aggregate-function combinators (`-If`, `-Array`)

## Sources Consulted
- ClickHouse docs — groupBitAnd: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitand
- ClickHouse docs — groupBitOr: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitor
- ClickHouse docs — groupBitXor: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/groupbitxor
- ClickHouse docs — Encoding functions (`bin`): https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse docs — Bit functions (`bitTest`): https://clickhouse.com/docs/en/sql-reference/functions/bit-functions
- ClickHouse docs — Aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
- **Incorrect `bin()` output width in the Practical Example.** The table originally declared `perms UInt64`, but the shown output rendered 8-character binary strings (`00001111`, `00000111`, etc.). ClickHouse's `bin()` produces a zero-padded, fixed-width string matching the input type's byte size, so `bin()` on a `UInt64` would return 64 characters. Changed the column type to `UInt8`, which makes the 8-character padded output accurate and remains appropriate for a flag bitmask that fits in `0b1111`.

## Review Notes
- The claim that all three functions accept both unsigned and signed integer types (UInt8..UInt64, Int8..Int64) matches the current ClickHouse documentation, which specifies `(U)Int*`.
- `bitTest(x, i)` returning 0/1 is accurate; it returns `UInt8`.
- The `-If` and `-Array` combinators usage (e.g. `groupBitOrIf`) is valid per the combinators reference.
- Note for readers: if the bitmask column is `UInt64` (or larger integer types), remember that `bin()` will emit a full-width 64-character string. Use a narrower type, or wrap with `substring()` / `lpad()`-style trimming if compact output is desired.
