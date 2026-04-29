# Validation Summary: How to Monitor IPv6 over MPLS

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 over MPLS (6PE / 6VPE)
- MPLS LSP Ping and Traceroute (RFC 4379 / RFC 8029)
- BFD (Bidirectional Forwarding Detection) for BGP
- Cisco IOS BGP / MPLS show & config commands
- SNMPv3 with AES privacy
- MPLS-LSR-STD-MIB (RFC 3813)
- MPLS-TE-STD-MIB (RFC 3812)
- MPLS-L3VPN-STD-MIB (RFC 4382)
- pysnmp (Python SNMP library)
- prometheus_client (Python Prometheus exporter)

## Sources Consulted
- RFC 3812 - Multiprotocol Label Switching (MPLS) Traffic Engineering MIB (https://datatracker.ietf.org/doc/html/rfc3812)
- RFC 3813 - MPLS Label Switching Router (LSR) MIB
- RFC 4382 - MPLS/BGP Layer 3 VPN MIB (https://datatracker.ietf.org/doc/html/rfc4382)
- RFC 8029 - Detecting MPLS Data-Plane Failures (LSP Ping)
- Cisco IOS configuration command reference for `snmp-server user`, `bfd-template`, BGP `fall-over bfd`
- Cisco IOS `show mpls forwarding-table`, `show bgp ipv6 unicast`, `show bfd neighbors` reference output

## Issues Found
1. **Incorrect `mplsTunnelOperStatus` OID column** — The Python monitoring snippet used `1.3.6.1.2.1.10.166.3.2.2.1.16`, which corresponds to `mplsTunnelLocalProtectInUse`. Per RFC 3812, `mplsTunnelOperStatus` is column 35. Updated the OID to `1.3.6.1.2.1.10.166.3.2.2.1.35` and the comment accordingly.
2. **Incorrect `mplsTunnelOperStatus` "up" value** — The code claimed `2 = up, others = down` and tested `int(state) == 2`. RFC 3812 defines `up(1)`, `down(2)`. Fixed the comparison to `== 1` and updated the comment to `1 = up, 2 = down`.
3. **Incomplete `snmp-server user` command** — The original used `priv aes PrivPass456`, but Cisco IOS requires the AES key length (`128 | 192 | 256`). Updated to `priv aes 128 PrivPass456`. Also fixed the group name: the user was placed in `v3Engine` while the group definition referenced `MONITOR-GROUP`. Made the user/group consistent and reordered so the view → group → user dependency is satisfied. Also removed the duplicate `snmp-server group` line (it was defined twice with conflicting parameters).
4. **Incorrect MIB reference for VPNv6 route counts** — `CISCO-IPSLA-MIB::cipslaMplsVpnBgpReach` is not a real OID; CISCO-IPSLA-MIB is the IP SLA MIB and does not contain VPN route counts. Replaced with `MPLS-L3VPN-STD-MIB::mplsL3VpnVrfPerfCurrNumRoutes` (RFC 4382), which is the standard OID for per-VRF current route count.
5. **Invalid IOS pipe filters using `grep`** — Cisco IOS does not support `grep` (or `-A`/`-B` context flags) as an output modifier; it supports `include`, `exclude`, `begin`, `section`. Replaced `| grep -B2 -A2 "Tagger"` with `| include 2001:db8` (matching IPv6 entries, the actual intent) and `| grep "IPv6\|State"` with `| include IPv6|State`.

## Review Notes
- The pysnmp code uses `from pysnmp.hlapi import *`, which works on pysnmp 4.x but not on the newer 6.x+ async-only API. This is acceptable for the example but readers on newer pysnmp may need to adjust imports (`pysnmp.hlapi.v3arch` or use the async API).
- The example LSP traceroute output shows the egress hop carrying a non-`Pop` label; in real deployments penultimate-hop popping (PHP) typically results in an `implicit-null` / `Pop` action at the egress hop, but this is a stylistic illustration rather than an inaccuracy.
- The `bfd template FAST-BFD` form on an interface is valid Cisco IOS syntax; on some platforms `bfd interval ... min_rx ... multiplier ...` is configured directly on the interface instead. Both styles are correct.
- `show mpls forwarding-table detail` output has changed labels across IOS versions ("Tag/Tagged" vs "Label"); using `include 2001:db8` is more robust against header changes.
