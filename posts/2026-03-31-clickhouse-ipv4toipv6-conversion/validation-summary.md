# Validation Summary: How to Use IPv4ToIPv6() for IP Address Conversion in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL)
- ClickHouse IP address functions: `IPv4ToIPv6`, `IPv6NumToString`, `IPv4CIDRToRange`, `toIPv4`, `toIPv6`
- ClickHouse types: `IPv4`, `IPv6`, `FixedString(16)`
- MergeTree engine
- RFC 4291 (IPv4-mapped IPv6 address format)

## Sources Consulted
- ClickHouse official IP address functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse string functions documentation (for `substr`/`substring` 1-based indexing semantics): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- RFC 4291 (IP Version 6 Addressing Architecture, Section 2.5.5.2 — IPv4-Mapped IPv6 Address)

## Issues Found
No technical issues found.

Verification details:
- `IPv4ToIPv6(ipv4)` accepts an `IPv4` (or `UInt32`) value and returns an `IPv6` (`FixedString(16)`) — matches the post.
- `IPv6NumToString` formats IPv4-mapped IPv6 addresses as `::ffff:x.x.x.x` per ClickHouse docs — matches the displayed output and the `startsWith(..., '::ffff:')` detection pattern.
- `substr(IPv6NumToString(client_ip), 8)` correctly extracts the IPv4 portion: `::ffff:` is 7 characters and ClickHouse's `substr` is 1-based, so position 8 is the first dotted-quad character.
- `IPv4CIDRToRange(toIPv4('192.168.1.0'), 24)` returns `Tuple(IPv4, IPv4)`; `.1` / `.2` tuple element access is valid ClickHouse syntax.
- `toIPv4`, `toIPv6`, `toString(IPv4)` round-trip behavior matches the documented behavior.
- The CIDR `BETWEEN` query is valid because `IPv6` (FixedString(16)) supports lexicographic ordering that aligns with numeric IP ordering, and both bounds are converted to IPv4-mapped IPv6 to match the unified column.
- RFC 4291 reference for the `::ffff:x.x.x.x` notation is correct (Section 2.5.5.2 — IPv4-Mapped IPv6 Address).

## Review Notes
- In the "Cross-Version Comparison" query, the `canonical_ipv6` alias is computed in the subquery but is not used by the outer SELECT. This is harmless (ClickHouse will simply prune or evaluate the column) and not a technical error, but the column could be removed in a future cleanup pass for clarity.
- The post uses `IPv6NumToString` consistently. ClickHouse also exposes `toString(IPv6)` which produces equivalent output; either is fine.
- Output formatting in the rendered result tables uses spaces for alignment; actual ClickHouse client output (e.g., `FORMAT PrettyCompact`) will look slightly different but the values are correct.
- All examples assume tables `ipv4_access_logs` and `ipv6_access_logs` exist; this is implicit context for the dual-stack ingestion example and is reasonable for a tutorial.
