# Validation Summary: How to Configure IPv6 VPN on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (firewall/router OS, FreeBSD-based)
- IPv6 (DHCPv6, SLAAC, RA, NDP)
- Unbound DNS
- ICMPv6 firewall rules
- Packet capture diagnostics

## Sources Consulted
- OPNsense official documentation: https://docs.opnsense.org/
- OPNsense Interfaces documentation (DHCPv6, Track Interface): https://docs.opnsense.org/manual/interfaces.html
- OPNsense Services documentation (DHCPv6, Router Advertisements, Unbound DNS): https://docs.opnsense.org/manual/dhcp.html and https://docs.opnsense.org/manual/unbound.html
- OPNsense Firewall documentation: https://docs.opnsense.org/manual/firewall.html
- OPNsense Diagnostics documentation: https://docs.opnsense.org/manual/diagnostics.html
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation - 2001:db8::/32)
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4862 (IPv6 Stateless Address Autoconfiguration)
- RFC 8415 (DHCPv6)

## Issues Found

1. **Diagnostics tool label incorrect**: The original text said `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`. This is technically wrong — in OPNsense, ARP Table shows IPv4 ARP entries, while IPv6 Neighbor Discovery (NDP) entries are displayed in a separate "NDP Table" view (`Interfaces → Diagnostics → NDP Table`). Fixed by changing the path to `Interfaces → Diagnostics → NDP Table  (shows IPv6 neighbors)`.

## Review Notes

- **Major content/title mismatch (not fixed)**: The post title is "How to Configure IPv6 VPN on OPNsense" and the tags include "VPN, WireGuard, OpenVPN", but the body contains no VPN, WireGuard, or OpenVPN configuration whatsoever. The body is a general OPNsense IPv6 configuration walkthrough (interfaces, DHCPv6, RA, firewall, Unbound, diagnostics). Per the review scope (technical accuracy of existing content, not adding new sections), this was not corrected by adding VPN content. The author or editor may want to either retitle the post (e.g., "How to Configure IPv6 on OPNsense") or replace it with actual VPN+IPv6 content. The conclusion sentence "How to Configure IPv6 VPN on OPNsense uses OPNsense's web interface..." reads awkwardly because of this mismatch.
- The example IPv6 addresses use the `2001:db8::/32` documentation prefix per RFC 3849, which is correct usage for examples. Note that `2001:db8:wan::` and `2001:db8:lan::` are illustrative — `wan`/`lan` are not valid hex characters but are clearly placeholders.
- OPNsense Router Advertisement modes ("Assisted", "Unmanaged", etc.) match the official WebGUI terminology.
- The Track Interface mode for LAN is the standard recommendation when using DHCPv6 prefix delegation upstream — this guidance is correct.
- The firewall rule guidance to allow ICMPv6 is essential and correctly emphasized; without ICMPv6 (in particular Neighbor Discovery and Path MTU Discovery), IPv6 connectivity will be broken or unreliable per RFC 4890.
- The mention of "Use IPv4 connectivity" being unchecked for native IPv6 in the WAN DHCPv6 config refers to the OPNsense option that enables DHCPv6 over IPv4 (relevant for some tunneled deployments) — this is correct.
- For OPNsense 23.x and later, all referenced menu paths are accurate as of the time of review.
