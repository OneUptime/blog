# Validation Summary: How to Use CRC32() and CRC64() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL database)
- CRC32 hash function
- CRC64 hash function
- MergeTree table engine
- SQL (concat, coalesce, toString, toTypeName, modulo)

## Sources Consulted
- ClickHouse official string functions documentation: https://clickhouse.com/docs/sql-reference/functions/string-functions
- Python `zlib.crc32` reference implementation (ClickHouse CRC32 uses the zlib implementation of CRC-32-IEEE 802.3 with initial value `0xffffffff`)
- Cross-verification using Python's `zlib.crc32(b'ClickHouse') == 1538217360` which matches the ClickHouse documented example output exactly, confirming the zlib equivalence.

## Issues Found
- **Incorrect CRC32 sample value**: The post originally claimed `CRC32('hello world!') = 1498229210`. Verified against ClickHouse's zlib-based CRC32 implementation (cross-checked via `python3 -c "import zlib; zlib.crc32(b'hello world!')"`) — actual value is `62177901`. Updated the output table to show the correct value. The other two values (`CRC32('hello world') = 222957957` and `CRC32('') = 0`) were verified correct.

## Review Notes
- The description "standard IEEE 802.3 CRC-32 checksum" is a slight simplification — ClickHouse's `CRC32()` uses the zlib implementation of the CRC-32-IEEE 802.3 polynomial with initial value `0xffffffff`. ClickHouse also provides a separate `CRC32IEEE()` function which uses the same polynomial but without the zlib initialization (it returns different values). The post's description is acceptable for general understanding, but readers who need the exact non-zlib IEEE variant should be aware of `CRC32IEEE()`.
- CRC64 in ClickHouse uses the CRC-64-ECMA polynomial; the post does not make specific numeric claims about CRC64 values that require verification.
- All SQL syntax (concat, coalesce, toString, toTypeName, MergeTree ENGINE, GROUP BY, HAVING, subquery JOIN) is valid ClickHouse SQL.
- The uniform-distribution claim used for modulo-based bucketing is reasonable in practice for well-behaved inputs, though CRC functions are not cryptographic hashes and should not be relied upon for adversarial uniformity — the post correctly warns about this in the introduction.
