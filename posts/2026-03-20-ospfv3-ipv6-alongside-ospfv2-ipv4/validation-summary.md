# Validation Summary: How to Configure OSPFv3 for IPv6 Alongside OSPFv2 for IPv4

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- OSPFv2
- IPv6 / IPv4 dual-stack routing
- FRRouting (FRR) `ospf6d` daemon and `vtysh`
- Cisco IOS / IOS XE OSPFv3 configuration
- OSPFv3 Address Families (RFC 5838)

## Sources Consulted
- RFC 5340 — OSPF for IPv6 (https://datatracker.ietf.org/doc/html/rfc5340)
- RFC 5838 — Support of Address Families in OSPFv3 (https://datatracker.ietf.org/doc/html/rfc5838)
- RFC 7166 — Supporting Authentication Trailer for OSPFv3
- FRR ospf6d documentation (https://docs.frrouting.org/en/latest/ospf6d.html)
- FRR User Guide — OSPFv3 commands and CLI reference
- Cisco IOS XE OSPFv3 Configuration Guide

## Issues Found
1. **FRR Address Family example was invalid.** The original post claimed FRR supports OSPFv3 Address Families (RFC 5838) and showed `address-family ipv4 unicast` inside `router ospf6`. This syntax does not exist in FRR's `ospf6d` — RFC 5838 (IPv4 over OSPFv3) is not implemented in FRR. Replaced the FRR AF example with a Cisco IOS XE `router ospfv3` example (which does support RFC 5838) and added a sentence clarifying FRR's lack of support for this feature.

## Review Notes
- The FRR OSPFv3 commands shown (`router ospf6`, `ospf6 router-id`, `ipv6 ospf6 area`) match current FRR syntax.
- The `show ipv6 ospf6 neighbor`, `show ipv6 ospf6 database`, and `show ipv6 route ospf6` commands are correct for FRR.
- The "Multiple instances: No" for OSPFv2 in the comparison table is the commonly cited distinction; technically RFC 6549 (2012) added multi-instance support to OSPFv2 via an Instance ID in Hello packets, but it is rarely used in practice. Left as-is since it reflects the practical, widely-taught difference.
- The "IPsec (no native auth)" cell for OSPFv3 reflects the original RFC 5340 design; RFC 7166 later added an authentication trailer for OSPFv3. The simplified statement is acceptable for an introductory comparison table.
- The mermaid `\n` line-break syntax in node labels is valid in current Mermaid.js renderers.
- Router IDs in OSPFv3 being IPv4-formatted dotted-quad values is correctly noted.
