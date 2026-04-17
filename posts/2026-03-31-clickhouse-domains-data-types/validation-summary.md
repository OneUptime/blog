# Validation Summary: How to Use Domains in ClickHouse Data Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse IPv4 and IPv6 domain/data types
- ClickHouse IP address functions (`toIPv4`, `toIPv6`, `isIPv4String`, `isIPv6String`, `IPv4ToIPv6`, `IPv6CIDRToRange`, `IPv6NumToString`)
- ClickHouse MergeTree engine

## Sources Consulted
- [ClickHouse IPv4 data type](https://clickhouse.com/docs/en/sql-reference/data-types/ipv4)
- [ClickHouse IPv6 data type](https://clickhouse.com/docs/en/sql-reference/data-types/ipv6)
- [ClickHouse IP address functions](https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions)
- [Altinity blog: Introducing ClickHouse IPv4 and IPv6 Domains](https://altinity.com/blog/introducing-clickhouse-ipv4-and-ipv6-domains-for-ip-address-handling)
- [ClickHouse GitHub issue #56487 (IPv6 Native Type)](https://github.com/ClickHouse/ClickHouse/issues/56487)
- [ClickHouse PR #49759 (Cast IPv6 to IPv4 for mapping block)](https://github.com/ClickHouse/ClickHouse/pull/49759)

## Issues Found

1. **IPv6 underlying storage type was outdated.** The post stated IPv6 is stored as `FixedString(16)`. Per the current official ClickHouse documentation, IPv6 is stored "in 16 bytes as UInt128 big-endian" (changed in ClickHouse 23.1; previously FixedString(16)). Updated all four occurrences in the post (intro paragraph, IPv6 Domain section, Domain Type Concept section, and Summary) to reflect `UInt128` big-endian.

2. **Incorrect IPv6-to-IPv4 extraction example.** The post contained:
   ```sql
   SELECT toIPv4(IPv6CIDRToRange(toIPv6('::ffff:192.168.1.1'), 128).1);
   ```
   This does not work as shown: `IPv6CIDRToRange(...).1` returns an `IPv6` value, and `toIPv4` only accepts `String` or unsigned integer inputs (UInt8/UInt16/UInt32) per the official documentation — it does not accept `IPv6`. Replaced with a documented, working example using `IPv6NumToString` which displays an IPv4-mapped IPv6 in canonical form.

## Review Notes

- The `toUInt32(toIPv4('192.168.1.1')) = 3232235777` example is verified correct: 192·256³ + 168·256² + 1·256 + 1 = 3232235777.
- The claim that "any function that works on UInt128 works on IPv6" is a simplification — some bitwise operations on IPv6 were historically limited (see GitHub issue #56487), though support has been expanding. Not flagged as an error since the post uses this statement conceptually.
- ClickHouse documentation has largely shifted from referring to IPv4/IPv6 as "domains" to calling them first-class data types. The post's framing around "domains" is still acceptable since the terminology is used in some parts of ClickHouse docs (e.g., the IPv6 page describes the "IPv6 domain") and in the Altinity introduction blog. No changes made to this framing.
- The `isIPv4String` / `isIPv6String` examples and return values are correct per the official docs.
- `IPv4ToIPv6(toIPv4('192.168.1.1'))` returning `::ffff:192.168.1.1` is correct.
