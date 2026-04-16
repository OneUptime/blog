# Validation Summary: How to Use IPv4CIDRToRange() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ClickHouse IP address functions: `IPv4CIDRToRange`, `toIPv4`, `IPv4NumToString`, `IPv4StringToNum`
- ClickHouse types: `IPv4`, `UInt32`, `UInt8`, `Tuple(IPv4, IPv4)`
- ClickHouse table functions: `numbers()`, `arrayJoin()`
- MergeTree engine
- IPv4 CIDR notation / RFC 1918 private address spaces

## Sources Consulted
- ClickHouse official documentation for IP Address Functions: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions
- ClickHouse documentation for `IPv4CIDRToRange`: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions#ipv4cidrtorange
- ClickHouse documentation for `toIPv4`: https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions#toipv4
- RFC 1918 (Address Allocation for Private Internets) — verifies the 10/8, 172.16/12, and 192.168/16 private address blocks
- RFC 5737 (IPv4 Address Blocks Reserved for Documentation) — verifies the TEST-NET ranges 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 used in examples
- Python `ipaddress` module — used to independently verify all expected CIDR range outputs and address counts

## Issues Found
No technical issues found.

All of the following were verified as correct:

- The function signature `IPv4CIDRToRange(ip, prefix_length)` matches the documented ClickHouse API, which accepts an `IPv4` (or `UInt32`) and a `UInt8` prefix length, and returns `Tuple(IPv4, IPv4)`.
- All expected outputs in the "Basic Usage" table are numerically correct:
  - `192.168.1.100/24` → `(192.168.1.0, 192.168.1.255)` ✓
  - `10.0.0.50/8` → `(10.0.0.0, 10.255.255.255)` ✓
  - `172.16.5.200/12` → `(172.16.0.0, 172.31.255.255)` ✓
  - `8.8.8.8/32` → `(8.8.8.8, 8.8.8.8)` ✓
- All rows in the "Subnet Size Calculation" expected-output table are correct:
  - /8 → 16,777,216 addresses; /16 → 65,536; /24 → 256; /28 → 16; /30 → 4; /32 → 1.
- The RFC 1918 ranges used in the "Classifying Traffic by Network Segment" example (10/8, 172.16/12, 192.168/16) are the correct private address blocks.
- The documentation ranges used in the `cidr_owners` example (203.0.113.0/24, 198.51.100.0/24, 192.0.2.0/24) are correct RFC 5737 TEST-NET blocks — an appropriate choice for example data.
- The MergeTree `CREATE TABLE` syntax, `ORDER BY` tuple, and `INSERT INTO ... VALUES` syntax are valid ClickHouse SQL.
- The "Generating All Host IPs in a /24 Subnet" query correctly iterates over `numbers(256)` and filters out the network (`.0`) and broadcast (`.255`) addresses, yielding 254 usable host IPs.
- Tuple element access with `.1` and `.2` is the standard ClickHouse syntax for extracting elements from a `Tuple`.
- `IPv4StringToNum` returning `UInt32` and `IPv4NumToString` accepting `UInt32` — the round-trip conversion shown in the examples is valid.

## Review Notes

- The term "broadcast_addr" used for the second element of the tuple is a common and reasonable shorthand, but strictly speaking the second element is just "the last IP address in the CIDR block." For `/31` and `/32` prefixes there is no true broadcast address (per RFC 3021 for `/31`), though `IPv4CIDRToRange` still returns the highest IP in the range. The post's `/32` example (`8.8.8.8/32 → 8.8.8.8`) is consistent with this behavior.
- The "Basic Usage" example uses two `arrayJoin` calls in a single `SELECT` and then filters with `WHERE` to produce 4 paired rows from the 16-row cross product. This is an unusual pattern — a cleaner alternative would be `SELECT arrayJoin([('192.168.1.100', 24), ('10.0.0.50', 8), ...])` — but the shown query is syntactically valid and does produce the table shown. Left as-is to preserve author style per review guidelines.
- For membership tests at scale, readers may also want to know about the closely related `isIPAddressInRange(address, prefix)` function, which takes a CIDR string directly. Not a correction — just a complementary function worth knowing. The post is scoped to `IPv4CIDRToRange` and is self-consistent.
- No version-specific caveats: `IPv4CIDRToRange` has been a stable part of ClickHouse for many releases and all syntax used is current as of the 2026-04-16 review date.
