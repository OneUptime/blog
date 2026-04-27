# Validation Summary: How to Configure IPv6 Router Advertisements on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OPNsense (firewall/router OS, FreeBSD-based)
- IPv6 (SLAAC, DHCPv6, prefix delegation)
- Router Advertisements (radvd / RA daemon)
- ICMPv6 / NDP (Neighbor Discovery Protocol)
- Unbound DNS
- OPNsense WebGUI navigation

## Sources Consulted
- OPNsense Interfaces Diagnostics: https://docs.opnsense.org/manual/diagnostics_interfaces.html
- OPNsense Firewall Rules: https://docs.opnsense.org/manual/firewall.html
- OPNsense Interfaces (DHCPv6 client): https://docs.opnsense.org/manual/interfaces.html
- OPNsense Router Advertisements (radvd): https://docs.opnsense.org/manual/radvd.html
- OPNsense DHCP services: https://docs.opnsense.org/manual/dhcp.html

## Issues Found
1. **Diagnostics path for IPv6 neighbors was incorrect.** The post claimed `Interfaces → Diagnostics → ARP Table (shows IPv6 NDP)`, but ARP Table is IPv4-only. OPNsense exposes a separate `Interfaces → Diagnostics → NDP Table` for IPv6 neighbors. Changed to `NDP Table (shows IPv6 neighbors)`.
2. **Firewall protocol value was incorrect.** With `TCP/IP Version: IPv6`, the protocol dropdown value for ICMPv6 rules is `IPV6-ICMP`, not `ICMP`. Updated `Protocol: ICMP` to `Protocol: IPV6-ICMP` and `ICMP type` to `ICMPv6 type` to match the OPNsense WebGUI labels.
3. **WAN DHCPv6 prefix field label was incorrect.** The post used `Request Prefix Size: /48`, but the actual OPNsense field is `Prefix delegation size` (numeric, no leading slash). Also corrected `Send IPv6 Prefix Hint` casing to match the WebGUI label `Send IPv6 prefix hint`.

## Review Notes
- The post targets OPNsense 23.x or later. Starting in OPNsense 25.x, the legacy ISC DHCPv6 server has been deprecated in favor of Kea DHCP and Dnsmasq (which can also serve as the RA source). The `Services → DHCPv6 → [LAN]` path shown is still valid on 23.x/24.x where ISC DHCPv6 remains available, but readers on newer releases may need to use `Services → Kea DHCP` instead. This is a forward-looking caveat rather than a current error.
- The Router Advertisements modes are simplified. OPNsense actually offers four relevant modes: Unmanaged (SLAAC, no other info), Managed (DHCPv6 only — M flag), Assisted (SLAAC + DHCPv6 — M+O flags), and Stateless (SLAAC + other info via DHCPv6 — O flag). The post's two-mode summary is directionally correct for the typical home/lab use case but readers wanting strict M/O-flag control should consult the radvd manual page linked above.
- Documentation link example domains (`2001:db8:wan::`, `2001:db8:lan::`) are reserved per RFC 3849 and correctly used.
- Google Public DNS IPv6 resolvers (`2001:4860:4860::8888`, `::8844`) are correct.
