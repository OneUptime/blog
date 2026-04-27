# Validation Summary: How to Configure IPv6 WAN Interface on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (firewall distribution based on FreeBSD)
- IPv6
- DHCPv6 (server and client / prefix delegation)
- SLAAC (Stateless Address Autoconfiguration)
- Router Advertisements (radvd)
- ICMPv6 firewall rules
- Unbound DNS (AAAA host overrides)
- OPNsense diagnostic tools (NDP Table, Ping, Packet Capture)

## Sources Consulted
- [OPNsense IPv6 setup documentation](https://docs.opnsense.org/manual/ipv6.html)
- [OPNsense Router Advertisements documentation](https://docs.opnsense.org/manual/radvd.html)
- [OPNsense Diagnostics — Interfaces](https://docs.opnsense.org/manual/diagnostics_interfaces.html)
- [OPNsense Neighbors / NDP documentation](https://docs.opnsense.org/manual/neighbors.html)
- RFC 4861 (Neighbor Discovery for IPv6) and RFC 3849 (IPv6 documentation prefix)

## Issues Found
- **Diagnostics section — ARP Table mislabeled as showing IPv6 NDP.** The original text listed `Interfaces → Diagnostics → ARP Table  (shows IPv6 NDP)`. In OPNsense, the ARP Table only shows IPv4 ARP entries; IPv6 neighbor entries are displayed by a separate diagnostic page, `Interfaces → Diagnostics → NDP Table`. Fixed by replacing the line with `Interfaces → Diagnostics → NDP Table   (shows IPv6 neighbors)`.

## Review Notes
- The example IPv6 addresses (`2001:db8:wan::2`, `2001:db8:lan::100`, etc.) use the `2001:db8::/32` documentation prefix per RFC 3849, which is correct, but the `wan` and `lan` labels include characters (`w`, `n`) that are not valid hexadecimal digits and so are not literally parseable IPv6 addresses. They are clearly intended as placeholders identifying the segment, and the surrounding prose makes this obvious, so I left them unchanged.
- The DHCPv6 / Router Advertisements menu structure (`Services → DHCPv6 → [LAN]`, `Services → Router Advertisements → [LAN]`) reflects the legacy ISC DHCPv6 stack still shipped with OPNsense. Newer OPNsense releases also expose a Kea-based DHCP UI (`Services → Kea DHCP`) but the ISC paths remain valid for users who keep the classic server enabled. No change made.
- The Unbound Host Override page is technically reached via `Services → Unbound DNS → Overrides` (with Host Overrides as a section on that page), but the post's shorthand `Services → Unbound DNS → Host Overrides` is unambiguous and consistent with how the OPNsense docs themselves often refer to the section. Left as-is.
- The Router Advertisement modes named in the post (`Unmanaged` for SLAAC-only and `Assisted` for RA + DHCPv6) match OPNsense's radvd configuration terminology.
