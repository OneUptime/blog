# Validation Summary: How to Debug OSPFv3 Issues with Packet Captures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OSPFv3 (RFC 5340)
- IPv6
- tcpdump
- Wireshark / tshark display filters
- FRRouting (FRR) ospf6d

## Sources Consulted
- [Wireshark Display Filter Reference: OSPF](https://www.wireshark.org/docs/dfref/o/ospf.html)
- [RFC 5340 — OSPF for IPv6](https://www.rfc-editor.org/rfc/rfc5340) (protocol number 89, AllSPFRouters multicast `ff02::5`, message types, Options field bits)
- [tcpdump manual page — pcap-filter syntax](https://www.tcpdump.org/manpages/pcap-filter.7.html) (`ip6 proto N` primitive)
- [FRRouting OSPF6 documentation](https://docs.frrouting.org/en/latest/ospf6.html) (`debug ospf6 neighbor|flooding|route` commands)

## Issues Found
Four Wireshark display filter field names were incorrect. They were verified against the official Wireshark Display Filter Reference for OSPF and corrected:

1. `ospf.routerid` → `ospf.srcrouter`. The Wireshark reference has no `ospf.routerid` field; the correct name for the OSPF Router ID in the packet header is `ospf.srcrouter` ("Source OSPF Router"). Used in two places (filter example and tshark fields list).
2. `ospf.hello.hellointervall` → `ospf.hello.hello_interval`. The original had a typo (double `l`, no underscore). Correct field name per Wireshark reference is `ospf.hello.hello_interval`.
3. `ospf.hello.deadintervall` → `ospf.hello.router_dead_interval`. Same typo plus wrong base name. Correct field name is `ospf.hello.router_dead_interval`.
4. `ospf.db_desc.interface_mtu` → `ospf.db.interface_mtu`. Wireshark uses the `ospf.db.*` namespace for Database Description fields, so the correct filter is `ospf.db.interface_mtu`.

All other technical content was verified as correct: tcpdump's `ip6 proto 89` primitive captures OSPFv3 traffic; OSPFv3 multicasts to `ff02::5` (AllSPFRouters); the message-type values 1–5 (Hello, DBD, LSR, LSU, LSAck) match RFC 5340; the Options bits decoding `0x000013` to `V6 | E | R` is consistent with RFC 5340 §A.2; and the FRR `debug ospf6 {neighbor,flooding,route}` and `no debug ospf6 all` commands are valid in vtysh.

## Review Notes
- The example showing default Hello/Dead intervals of `10/40` versus `30/120` correctly mirrors the OSPF defaults for broadcast/p2p (10s hello, 40s dead) versus NBMA-style (30s hello, 120s dead) interfaces, so the "MISMATCH" example is realistic.
- The tcpdump output snippet under "Understanding tcpdump OSPFv3 Output" is illustrative — actual `tcpdump -v` output formatting varies slightly across libpcap/tcpdump versions, but the field names and values shown are consistent with current tcpdump releases.
- The `ospf.srcrouter` field is encoded as an IPv4 address even for OSPFv3 (Router IDs remain 32-bit dotted-quad in OSPFv3), so the example value `1.1.1.1` is valid.
