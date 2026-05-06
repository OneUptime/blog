# Validation Summary: How to Peer BGP Over IPv6 Link-Local Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6 link-local addressing
- FRRouting
- Cisco IOS XE
- Linux networking tools (`ip`, `ping`, `tcpdump`)

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS XE IPv6 link-local BGP peering guide: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-mbgp-lla-peer-xe.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 2545, Use of BGP-4 Multiprotocol Extensions for IPv6 Inter-Domain Routing: https://www.rfc-editor.org/rfc/rfc2545.html
- RFC 7404, Using Only Link-Local Addressing inside an IPv6 Network: https://www.rfc-editor.org/rfc/rfc7404.html
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007.html
- Local CLI help checked for `ip`, `ping`, and `tcpdump` on the review host (`ip -h`, `ping -h`, `tcpdump --help`)

## Issues Found
- The FRRouting example used an older address-scoped style. I updated it to the current interface-based unnumbered syntax documented by FRR: `neighbor eth0 interface v6only remote-as 65002`.
- The Cisco IOS XE example used unsupported neighbor syntax for this feature. Cisco documents link-local peering with the peer's link-local address plus `%<interface>`, not `neighbor <interface> interface remote-as ...`, so I corrected the neighbor lines accordingly.
- The Cisco IOS XE example also advertised IPv6 routes without the documented outbound next-hop handling. Cisco's guide states that without an outbound route-map setting a global IPv6 next hop, updates can default to `::` and be rejected by the peer. I added a loopback address and outbound route-map to make the example technically complete.
- The FRRouting next-hop example was incorrect for reflected iBGP routes. `next-hop-self` alone does not rewrite routes learned via iBGP in FRR; `next-hop-self force` is required for that case. I also replaced the invalid placeholder `2001:db8::route-reflector` with a syntactically valid example address.
- The troubleshooting example used `ping6`. I updated it to `ping -6`, which matches current `iputils` help output while preserving the required zone identifier syntax for a link-local destination.

## Review Notes
- The article is technically relevant and salvageable; no removal concerns.
- The FRRouting and Cisco examples now reflect current vendor documentation as of May 6, 2026.
- For IPv6 routes learned over link-local sessions, the key operational caveat is next-hop reachability beyond the local link. The updated post now states that the next hop must be rewritten to a reachable address when advertising those routes to iBGP peers on other links.
