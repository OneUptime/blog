# Validation Summary: How to Configure IPv6 Prefix Delegation on OPNsense

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OPNsense (firewall/router OS, FreeBSD-based)
- IPv6 / DHCPv6 / DHCPv6-PD (Prefix Delegation)
- SLAAC and Router Advertisements (RA)
- ICMPv6
- Unbound DNS (AAAA host overrides)
- NDP (Neighbor Discovery Protocol)

## Sources Consulted
- [OPNsense IPv6 setup manual](https://docs.opnsense.org/manual/ipv6.html)
- [OPNsense Neighbors / ARP & NDP documentation](https://docs.opnsense.org/manual/neighbors.html)
- [OPNsense IPv6 for generic DSL dialup](https://docs.opnsense.org/manual/how-tos/ipv6_dsl.html)
- [OPNsense IPv6 behind an AVM Fritz!Box](https://docs.opnsense.org/manual/how-tos/ipv6_fb.html)
- [Zenarmor: Diagnostic Tools in OPNsense](https://www.zenarmor.com/docs/network-security-tutorials/what-are-diagnostic-tools-on-opnsense)
- HomeNetworkGuy: How to Configure IPv6 Prefix Delegation on OPNsense

## Issues Found

1. **Incorrect diagnostic tool for IPv6 neighbors.** The post originally referenced `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`. The ARP Table in OPNsense holds IPv4 entries only; IPv6 neighbor entries live in a separate **NDP Table** diagnostic. Fixed by replacing the line with `Interfaces → Diagnostics → NDP Table  (shows IPv6 neighbors)`.

2. **Inaccurate WAN DHCPv6 field name.** The post used `Request Prefix Size: /48` and `Send IPv6 Prefix Hint`. The current OPNsense WAN DHCPv6 UI labels the field `Prefix delegation size` (which takes a numeric value, not a slash-prefixed string) and `Send IPv6 prefix hint` (lowercase "prefix hint"). Updated values to `Prefix delegation size: 48` and `Send IPv6 prefix hint: ✓` to match the actual UI.

## Review Notes
- The post is titled "IPv6 Prefix Delegation" but covers a broader IPv6 stack (WAN DHCPv6, LAN tracking, RA modes, firewall, Unbound). The PD-related sections (WAN DHCPv6 → LAN Track Interface) are technically correct after the fixes.
- `Use IPv4 connectivity` is the OPNsense option that, when checked, lets DHCPv6 ride over the IPv4 connection (useful for ISPs that deliver IPv6 over an IPv4-PPPoE session). Leaving it unchecked for native dual-stack IPv6 — as the post recommends — is correct.
- For the LAN Track Interface, the `IPv6 Prefix ID` is a hex value (0x00..0x(2^n - 1) where n is bits available between the delegated prefix size and /64). With a /48 delegation and /64 LAN, IDs `0`..`ffff` are all valid; the example value of `0` is fine.
- Router Advertisement modes used in the post — `Assisted` (RA + stateful DHCPv6) and `Unmanaged` (SLAAC only) — match the OPNsense option labels.
- Firewall: setting `TCP/IP Version: IPv6` with `Protocol: ICMP` correctly produces an ICMPv6 rule in OPNsense; the protocol field is context-aware.
- No version-specific deprecations affecting OPNsense 23.x or later were identified for the configuration paths shown.
