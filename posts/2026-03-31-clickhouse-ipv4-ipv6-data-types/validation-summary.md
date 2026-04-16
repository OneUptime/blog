# Validation Summary: How to Use IPv4 and IPv6 Data Types in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (IPv4 and IPv6 data types)
- SQL (CREATE TABLE, INSERT, SELECT, GROUP BY, aggregations)
- ClickHouse IP-address functions (`toIPv4`, `toIPv6`, `IPv4NumToString`, `IPv6NumToString`, `isIPAddressInRange`, `IPv4ToIPv6`, `bitAnd`)
- CIDR notation / subnet masking
- IPv4-mapped IPv6 addresses (RFC 4291)

## Sources Consulted
- [ClickHouse IPv4 data type docs](https://clickhouse.com/docs/en/sql-reference/data-types/ipv4)
- [ClickHouse IPv6 data type docs](https://clickhouse.com/docs/en/sql-reference/data-types/ipv6)
- [ClickHouse IP address functions docs](https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions)
- [ClickHouse issue #56487 — bitwise/IPv6 native type discussion](https://github.com/ClickHouse/ClickHouse/issues/56487)
- [Altinity — Introducing ClickHouse IPv4 and IPv6 Domains](https://altinity.com/blog/introducing-clickhouse-ipv4-and-ipv6-domains-for-ip-address-handling)

## Issues Found
- **IPv6 internal storage description was outdated.** The post stated that IPv6 is "stored as FixedString(16)". In modern ClickHouse (23.1+), the `IPv6` type is stored in 16 bytes as `UInt128` big-endian, not `FixedString(16)`. Updated the introductory paragraph to reflect the current internal representation. The byte size (16 bytes) was already correct.

## Review Notes
- All function names (`toIPv4`, `toIPv6`, `IPv4NumToString`, `IPv6NumToString`, `isIPAddressInRange`, `IPv4ToIPv6`) are valid and current per official ClickHouse documentation.
- `isIPAddressInRange()` requires String inputs for both arguments, which the examples correctly satisfy by wrapping the `IPv4` column with `IPv4NumToString()`.
- `bitAnd(client_ipv4, toIPv4('255.255.255.0'))` works because the `IPv4` type is backed by `UInt32`; `IPv4NumToString` accepts the resulting integer value to render the masked subnet.
- `IPv4ToIPv6` accepts a `UInt32` (and the `IPv4` column is implicitly compatible) and returns a `FixedString(16)` representing the IPv4-mapped IPv6 address.
- The CREATE TABLE example, INSERT VALUES, and aggregation queries are all syntactically correct ClickHouse SQL.
- IPv4-mapped IPv6 notation (`::ffff:192.168.1.42`) follows RFC 4291.
- Future caveat: ClickHouse may further evolve IP type semantics — readers using very old (<23.1) installations may still see `FixedString(16)` behavior in some places.
