# Validation Summary: How to Use toIPv4() and toIPv6() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL database)
- IPv4 and IPv6 data types
- IP address conversion functions: toIPv4(), toIPv6(), toIPv4OrNull(), toIPv6OrNull(), toIPv4OrDefault(), toIPv6OrDefault()

## Sources Consulted
- ClickHouse official documentation — IP address functions: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse official documentation — IPv4 data type: https://clickhouse.com/docs/en/sql-reference/data-types/ipv4
- ClickHouse official documentation — IPv6 data type: https://clickhouse.com/docs/en/sql-reference/data-types/ipv6

## Issues Found

1. **IPv6 internal storage type was incorrect**: The post stated IPv6 is stored as `FixedString(16)` internally. Per the official ClickHouse documentation, IPv6 is stored as `UInt128` (16 bytes, big-endian). Fixed in three locations: the function description, the mermaid diagram, and the summary paragraph.

2. **toIPv6() error behavior was incorrect**: The post claimed `toIPv6()` "Throws on invalid input." Per the official documentation, `toIPv6()` returns an empty value for invalid input (unlike `toIPv4()` which does throw). Changed the description to "Returns an empty value for invalid input."

## Review Notes
- All SQL code examples are syntactically correct and produce the expected output.
- The comparison/sorting example correctly demonstrates numeric (not lexicographic) ordering of IPv4 addresses.
- The aggregate query output (12288, 1024, 512 bytes) is arithmetically correct.
- The post correctly recommends using OrNull variants for untrusted input, which is good practice.
- The post could mention that IPv4 columns also accept plain string literals in INSERT statements without requiring explicit toIPv4() calls, but this is a minor omission and not an error.
