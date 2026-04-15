# Validation Summary: How to Build Network Flow Analysis with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, TTL, window functions, IPv4 type)
- NetFlow / IPFIX network flow protocols
- SQL (aggregation, bitwise operations, window functions)
- Network security analysis (DDoS detection, elephant flows, suspicious outbound connections)

## Sources Consulted
- ClickHouse documentation: Data Types — IPv4 (https://clickhouse.com/docs/en/sql-reference/data-types/ipv4)
- ClickHouse documentation: Functions — IP Address (https://clickhouse.com/docs/en/sql-reference/functions/ip-address-functions)
- ClickHouse documentation: Functions — Bit (https://clickhouse.com/docs/en/sql-reference/functions/bit-functions)
- ClickHouse documentation: MergeTree Engine and TTL (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse documentation: Window Functions (https://clickhouse.com/docs/en/sql-reference/window-functions)
- ClickHouse documentation: Aggregate Functions — countDistinct / uniqExact (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact)
- ClickHouse documentation: Functions — multiIf, dateDiff, toStartOfHour (https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions)

## Issues Found
- **Flawed subnet grouping in "Bandwidth Usage by Internal Subnet" query**: The original code used `substring(CAST(src_ip AS String), 1, 7)` to group by subnet. This approach is fundamentally broken because IP address octets have variable string lengths (1-3 digits each). For example, `10.0.0.1` becomes `10.0.0.` (7 chars) while `10.100.0.1` becomes `10.100.` (7 chars) — yielding inconsistent and misleading subnet groupings. Fixed by replacing with `IPv4NumToString(bitAnd(CAST(src_ip AS UInt32), 0xFFFF0000))`, which properly applies a /16 bitmask to produce correct subnet groupings like `10.0.0.0`, `10.1.0.0`, `10.100.0.0`, etc.

## Review Notes
- The DDoS detection query calculates PPS by dividing total packets by 60 seconds (the window size). This is an average PPS, not instantaneous — adequate for flow-based analysis but worth noting for readers expecting real-time precision.
- The `countDistinct` function used in several queries is a valid ClickHouse alias for `uniqExact`, giving exact (not approximate) distinct counts. For very high cardinality columns at scale, `uniq` (approximate, HyperLogLog-based) could be more performant.
- All other SQL examples (CREATE TABLE, aggregation queries, window functions, IPv4 comparisons with BETWEEN, TTL configuration) are syntactically correct and use current, non-deprecated ClickHouse features.
