# Validation Summary: How to Use bin() and unbin() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- `bin()` / `unbin()` encoding functions
- `hex()` function (comparison)
- `bitAnd()` bit manipulation
- `substring()` string function
- `numbers()` table function
- ASCII encoding
- IANA IP Protocol Numbers

## Sources Consulted
- ClickHouse Encoding Functions docs: https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions (bin, unbin)
- ClickHouse Bit Functions docs: https://clickhouse.com/docs/en/sql-reference/functions/bit-functions (bitAnd)
- ClickHouse Table Functions: https://clickhouse.com/docs/en/sql-reference/table-functions/numbers (numbers(N, M))
- IANA Protocol Numbers (ICMP=1, TCP=6, UDP=17)
- ASCII table (verified: 'A'=65, 'B'=66, ' '=32, 'H'=72, 'i'=105, 'O'=79, 'K'=75)

## Issues Found
- **`numbers(1, 9)` row count mismatch**: In the "Inspecting Bit Flags" example, the query used `numbers(1, 9)` which returns 9 rows (values 1 through 9), but the shown output table only contained 8 rows (user_id 1-8). Changed to `numbers(1, 8)` so the query matches the displayed output.

All other technical claims were verified correct:
- Binary representations of characters ('A' = 01000001, 'B' = 01000010, ' ' = 00100000, 'Hi' = 0100100001101001, 'OK' = 0100111101001011) all match ASCII codes.
- Integer binary representations (255 = 11111111, 5 as UInt16 = 0000000000000101, etc.) are correct.
- Type-width-based padding behavior (UInt8=8 chars, UInt16=16 chars, UInt32=32 chars, UInt64=64 chars) matches ClickHouse's documented behavior.
- Protocol numbers (ICMP=1, TCP=6, UDP=17) and their binary forms (00000001, 00000110, 00010001) are correct.
- `bitAnd()` returns the masked integer value (not a boolean), consistent with the displayed `can_read`/`can_write`/`can_execute`/`is_admin` column values.
- MSB/bit-7 extraction via `substring(bin(toUInt8(...)), 1, 1)` is correct because `bin()` outputs MSB-first.
- `unbin()` interprets groups of 8 binary digits as bytes — matches ClickHouse documented behavior; round-trip example `unbin(bin('OK'))` → `OK` is accurate.

## Review Notes
- `bitAnd(permission_flags, N)` in the bit-flags example returns the mask value (1, 2, 4, 8) rather than a 0/1 boolean. The post's output correctly reflects this, but readers new to bitmasks may expect boolean results; using `bitAnd(...) != 0` or `bitAnd(...) > 0` would be more idiomatic for a yes/no semantic. Left as-is since the outputs are consistent with the queries.
- The "Checking Individual Bits with bin()" and "unbin() for Decoding Stored Binary Strings" sections intentionally omit result tables; this is acceptable stylistically.
- No version-specific caveats: `bin()` and `unbin()` have been stable in ClickHouse for many releases.
