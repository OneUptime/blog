# Validation Summary: How to Choose Between String and FixedString in ClickHouse

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (columnar database)
- SQL (DDL and DML)
- ClickHouse String and FixedString data types
- ClickHouse hash functions (MD5, SHA1, SHA256)
- ClickHouse IP address functions (IPv4StringToNum)
- ClickHouse compression codecs (LZ4, ZSTD)

## Sources Consulted
- ClickHouse String type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/string
- ClickHouse FixedString type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/fixedstring
- ClickHouse hash functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse IP address functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse type conversion functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse native protocol basics (varint encoding): https://clickhouse.com/docs/en/native-protocol/basics
- ClickHouse string functions documentation (trimRight): https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found

### Issue 1: Incorrect String length prefix description
- **What was wrong:** The storage comparison table stated String uses "1 byte (length) + N bytes (data)" with "minimum 1 byte overhead." ClickHouse actually uses varint-encoded length prefixes. A varint is 1 byte only for strings up to 127 bytes; longer strings require 2+ bytes for the length prefix.
- **What was changed:** Updated the table to say "varint (length) + N bytes (data)" with a note that overhead is "1 byte for strings up to 127 bytes, grows for longer strings." Updated the country code example text to say "1-byte varint length" to clarify this is a specific case.
- **Why:** The original claim was misleading as a general statement. While the 2-char country code example happened to be correct (2 < 128, so varint is 1 byte), the table presented it as a universal rule.

### Issue 2: Invalid CAST from UInt32 to FixedString(4) for IPv4
- **What was wrong:** The IPv4 binary storage example used `IPv4StringToNum('192.168.1.1')::FixedString(4)`. `IPv4StringToNum` returns a `UInt32`, and `CAST(UInt32 AS FixedString(4))` is not a valid type conversion in ClickHouse.
- **What was changed:** Replaced with `reinterpretAsFixedString(IPv4StringToNum('192.168.1.1'))`, which correctly reinterprets the 4 bytes of the UInt32 as a FixedString(4).
- **Why:** `reinterpretAsFixedString` performs bit-level reinterpretation, which is the correct function for converting numeric types to their raw binary FixedString representation.

### Issue 3: Invalid \x hex escape sequences in SQL string
- **What was wrong:** The IPv6 binary value used `toFixedString('\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xc0\xa8\x01\x01', 16)`. ClickHouse SQL does not support `\x` hex escape sequences in string literals.
- **What was changed:** Replaced with `unhex('00000000000000000000FFFFC0A80101')::FixedString(16)`, which correctly produces the 16-byte binary representation of the IPv4-mapped IPv6 address.
- **Why:** `unhex()` is the standard ClickHouse way to construct binary strings from hex representations and returns a String that can be cast to FixedString when the length matches.

## Review Notes
- The comparison behavior of `toFixedString('US', 2) = toFixedString('US', 4)` (claimed to produce an ERROR) is plausible since these are different types, but the exact behavior (error vs. implicit cast) is not explicitly documented. Left as-is since the point being made (different FixedString sizes are incompatible) is directionally correct.
- The post correctly recommends using native `IPv4`/`IPv6` types over FixedString for IP addresses in the decision guide table, even though it shows the FixedString approach as an example. This is good practice.
- The `reinterpretAsFixedString` function returns bytes in the platform's native byte order (typically little-endian), which means the bytes of the IPv4 address will be reversed compared to network byte order. This is a subtlety worth noting but doesn't make the code incorrect for storage/retrieval purposes as long as it's consistently used.
- All hash function return types (MD5 → FixedString(16), SHA1 → FixedString(20), SHA256 → FixedString(32)) were verified as correct.
