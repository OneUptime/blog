# Validation Summary: How to Understand IPv6 Link-Local Addresses as Next Hops

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Link-local addressing
- Neighbor Discovery
- Router Advertisements
- Linux `ip route`
- FRRouting OSPFv3
- FRRouting BGP

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4007, "IPv6 Scoped Address Architecture" https://datatracker.ietf.org/doc/html/rfc4007
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" https://datatracker.ietf.org/doc/rfc4861/
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" https://www.rfc-editor.org/rfc/rfc4862
- RFC 5340, "OSPF for IPv6" https://datatracker.ietf.org/doc/rfc5340/
- RFC 2545, "Use of BGP-4 Multiprotocol Extensions for IPv6 Inter-Domain Routing" https://datatracker.ietf.org/doc/html/rfc2545
- RFC 1195, "Use of OSI IS-IS for Routing in TCP/IP and Dual Environments" https://www.rfc-editor.org/rfc/rfc1195
- RFC 5308, "Routing IPv6 with IS-IS" https://www.rfc-editor.org/rfc/rfc5308
- FRRouting BGP documentation https://docs.frrouting.org/en/latest/bgp.html
- FRRouting OSPFv3 documentation https://docs.frrouting.org/en/latest/ospf6d.html
- Local Linux manual pages: `man ip-route`, `man ping`, `man ssh`

## Issues Found
- The opening and closing summaries overstated the behavior as a general IPv6 routing rule. I narrowed the wording to directly connected links so it matches RFC behavior and avoids implying that all IPv6 next-hop handling, including BGP next-hop encoding, is link-local-only.
- The static-route example included a kernel-specific error string. I replaced it with an explanation that Linux cannot infer the outbound interface for a link-local next hop, which is the actual technical requirement documented by `ip-route`.
- The traceroute example used a link-local source address to reach a remote global IPv6 destination. That is not valid because routers must not forward packets with link-local source addresses off-link, so I changed the example to tracing to a link-local neighbor on the local link.
- The Router Advertisement section said the RA "contains the default gateway." I corrected this to describe the actual mechanism from RFC 4861: hosts use the RA sender's link-local source address as the default router when the Router Lifetime is non-zero.
- The dynamic-routing section incorrectly included IS-IS as using IPv6 link-local addresses for adjacency. IS-IS runs directly over Layer 2 and does not form adjacencies using IPv6 link-local addresses, so I removed that claim.
- The FRRouting OSPFv3 command was incorrect. I changed `show ipv6 ospf neighbor` to the documented `show ipv6 ospf6 neighbor`.
- The FRRouting BGP example used undocumented syntax for link-local peering. I changed it to FRR's documented interface-based unnumbered syntax with `v6only` to make the IPv6 link-local behavior explicit.

## Review Notes
- `ping6` remains valid on many Linux systems, but modern iputils generally documents the unified `ping -6` form. The current example still works as written.
- The post correctly uses `fe80::/10` as the reserved link-local range. In practice, RFC 4291 defines the operational link-local unicast format with the following 54 bits set to zero, which is why normal addresses appear under `fe80::/64`.
