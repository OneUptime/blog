# Validation Summary: How to Understand Link-Local Addresses (fe80::/10)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing architecture
- IPv6 link-local unicast addresses
- Neighbor Discovery Protocol (NDP)
- Router Advertisements (RA)
- SLAAC
- Python `socket` networking
- Linux networking tools (`ip`, `ping`, `tcpdump`, `ip6tables`)

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 7217, A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC): https://www.rfc-editor.org/rfc/rfc7217
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://www.rfc-editor.org/rfc/rfc8064
- Python `socket` documentation: https://docs.python.org/3.11/library/socket.html
- Local Linux documentation checked with `ping(8)`, `ip-address(8)`, `ip-neighbour(8)`, `tcpdump(8)`, and `ip6tables(8)` / command help output
- RFC 6105, IPv6 Router Advertisement Guard: https://www.rfc-editor.org/rfc/rfc6105
- RFC 7113, Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard): https://www.rfc-editor.org/rfc/rfc7113

## Issues Found
1. Corrected the opening and concluding claims that implied `fe80::/10` addresses appear on every IPv6 interface. The post now correctly scopes that statement to IPv6-enabled non-loopback interfaces, since loopback uses `::1` rather than a `fe80::/10` address.
2. Changed the RFC 7217 description from "Random" to "Stable opaque value". RFC 7217 defines stable, semantically opaque interface identifiers rather than purely random temporary ones.
3. Updated the `ping` example and explanation. Current Linux documentation treats interface selection as required for link-local destinations, but it can be provided either with `%iface` notation or `-I iface`, so the original "mandatory `%eth0`" wording was too absolute.
4. Fixed the `ip -6 neigh show` example output. Linux identifies the interface separately with `dev eth0`; it does not append `%eth0` to the displayed neighbor address in normal `ip neigh` output.
5. Changed `sock.send(...)` to `sock.sendall(...)` in the Python example. Per the Python socket documentation, `send()` may write only part of the buffer, while `sendall()` is the correct API for sending the full request payload.
6. Narrowed the default-route explanation to RA-learned behavior and corrected the "RA Guard" wording. Router Advertisements identify routers by their link-local address, but host firewall filtering with `ip6tables` is not the same thing as Layer-2 RA-Guard as defined in RFC 6105/7113.

## Review Notes
- The EUI-64 example is technically correct as an example of Modified EUI-64 construction, but modern guidance recommends stable opaque IIDs (RFC 7217 / RFC 8064) rather than embedding stable MAC-derived identifiers by default.
- The `tcpdump` filter shown is valid, but like many fixed-offset IPv6 BPF examples it assumes no extension headers between the IPv6 header and ICMPv6.
