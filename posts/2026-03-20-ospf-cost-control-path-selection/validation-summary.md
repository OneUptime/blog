# Validation Summary: How to Set OSPF Cost to Control Path Selection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- Cisco IOS configuration
- Auto-cost reference bandwidth
- Interface cost manipulation
- ECMP (Equal Cost Multi-Path) load balancing
- Cisco Express Forwarding (CEF)

## Sources Consulted
- Cisco "OSPF Cost" support doc: https://www.cisco.com/c/en/us/support/docs/ip/open-shortest-path-first-ospf/7039-1.html
- Cisco IOS IP Routing: OSPF Command Reference (auto-cost): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-a1.html
- Cisco IOS OSPF command reference (`ip ospf cost`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-i1.html
- Cisco IOS OSPF command reference (`show ip ospf ...`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-s1.html and ospf-s2.html
- Cisco "How Does Load Balancing Work?" (CEF): https://www.cisco.com/c/en/us/support/docs/ip/express-forwarding-cef/18285-loadbal-cef.html
- RFC 2328 (OSPF Version 2)

## Issues Found
- **Step 6 - Non-existent verification command**: The post used `show ip ospf topology detail | include cost`, which does not exist in Cisco IOS. OSPF has no `topology` subcommand (that belongs to EIGRP); OSPF uses `show ip ospf database` for the LSDB. Replaced with `show ip route ospf`, which is the canonical Cisco IOS command to verify installed OSPF routes and their total path cost after a cost change.

## Review Notes
- Default reference bandwidth (100 Mbps / 10^8 bps), `auto-cost reference-bandwidth` syntax (range 1–4294967 Mbps), `ip ospf cost` range (1–65535), the default cost table, the recalculated cost values for a 10000 reference, the `show ip ospf interface brief` output format, and `[110/cost]` route metric notation are all accurate.
- The `maximum-paths 4` example is correct under `router ospf`. Default ECMP path count is 4 on most IOS images, though modern IOS-XE platforms support higher ceilings (16/32/64 depending on platform). The example is conservative and works everywhere.
- "Cisco IOS performs per-flow ECMP load balancing" is loosely worded — CEF's default is technically per-destination (with src/dst hashing), which behaves flow-like in practice. Cisco's own docs sometimes use these terms interchangeably, so this is acceptable but could be clarified in a future revision.
- The reminder that `auto-cost reference-bandwidth` must be configured identically on every router in the OSPF domain is correct and important — mismatched reference bandwidths cause asymmetric path selection.
