# Validation Summary: How to Configure Static Routing for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MikroTik RouterOS (v7 syntax)
- Static IPv4 routing (`/ip route`)
- Floating static routes (administrative distance)
- check-gateway (ping-based failover)
- Policy routing (`/routing table`, mangle `mark-routing`)
- Blackhole and unreachable route types
- RFC 5737 documentation prefixes (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)

## Sources Consulted
- MikroTik RouterOS documentation: IP Routing — https://help.mikrotik.com/docs/display/ROS/IP+Routing
- MikroTik RouterOS v7 Routing Tables — https://help.mikrotik.com/docs/display/ROS/Policy+Routing
- MikroTik wiki / forum threads on RouterOS v6→v7 migration of `routing-mark` → `routing-table`
- RFC 5737 (IPv4 Address Blocks Reserved for Documentation)

## Issues Found
- Post description mentioned "recursive next-hops" but the post does not cover that topic. Updated the description to accurately reflect what is covered (default gateway, specific networks, floating routes, check-gateway failover, and policy routing).

Note: Prior staged edits (already on disk before this review) had also reordered the policy routing example so the routing table is created before being referenced — required in RouterOS v7 — and replaced the v6-only `/ip route check 8.8.8.8` with the v7-compatible `/ip route print where 8.8.8.8 in dst-address active=yes`. Both are correct.

## Review Notes
- All `/ip route add` syntax (dst-address, gateway, distance, comment, check-gateway, type=blackhole|unreachable) matches current RouterOS documentation.
- The policy routing flow is correct for RouterOS v7: routing table created first with `/routing table add name=ISP2 fib`, route placed into that table via `routing-table=ISP2`, and the mangle rule sets `new-routing-mark=ISP2` (the routing-mark name maps to the routing-table name).
- Important version caveat (not stated explicitly in the post): in RouterOS v6 the route parameter was `routing-mark=` and routing tables were implicit. The examples here will not work unmodified on v6.
- Default administrative distance for static routes is 1, so the floating static example correctly uses distance=5 for backup.
- `check-gateway=ping` is a valid option (other valid values include `arp`, `bfd`, `bfd-multihop`, `none`).
- RFC 5737 reservation is correctly cited.
