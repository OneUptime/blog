# Validation Summary: How to Understand IPv6 Link-Local Addresses (fe80::/10)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 addressing (link-local, fe80::/10)
- Modified EUI-64 interface identifier construction
- Neighbor Discovery Protocol (NDP)
- Stateless Address Autoconfiguration (SLAAC)
- Router Advertisements / Router Solicitations
- IPv6 zone IDs (RFC 4007 scope identifiers)
- Linux `ip` / `ifconfig` / `ping6` / `tcpdump`
- DHCPv6 (UDP ports 546/547)
- Python `ipaddress` module and `socket` API

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (link-local prefix, Appendix A for Modified EUI-64): https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4862 — IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4007 — IPv6 Scoped Address Architecture (zone IDs): https://datatracker.ietf.org/doc/html/rfc4007
- RFC 6874 — Representing IPv6 Zone Identifiers in Address Literals and URIs: https://datatracker.ietf.org/doc/html/rfc6874
- RFC 4861 — Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- pcap-filter(7) manpage: https://www.tcpdump.org/manpages/pcap-filter.7.html
- Python `socket` / `ipaddress` module docs: https://docs.python.org/3/library/socket.html, https://docs.python.org/3/library/ipaddress.html
- `ip-address(8)` / iproute2 manpages

## Issues Found
1. **RFC reference for Modified EUI-64**: The post attributed the Modified EUI-64 construction to RFC 4862. The ff:fe insertion and U/L bit flip are actually specified in RFC 4291 Appendix A. RFC 4862 (SLAAC) merely references it. Updated the comment to cite `RFC 4291 Appendix A`.
2. **URL encoding of zone IDs**: The example `http://[fe80::1%eth0]:8080/` used a bare `%` character, which is invalid in a URI per RFC 3986. Per RFC 6874, the `%` separating the zone ID in URIs must be percent-encoded as `%25`. Updated the example to `http://[fe80::1%25eth0]:8080/` with a comment referencing RFC 6874.
3. **tcpdump filter operator precedence**: The original filter `ip6 and udp port 546 or port 547` is parsed (per pcap-filter(7), `and`/`or` are left-associative with equal precedence) as `((ip6 and udp port 546) or port 547)`, which would also match IPv4 traffic on port 547. Corrected to `'ip6 and udp and (port 546 or port 547)'` with shell quoting so the parentheses are not interpreted by the shell.

## Review Notes
- `ping6` is still available on most Linux distros but has been merged into `ping -6` on modern iputils; both remain functional.
- The Python socket example `("fe80::1%eth0", 8080, 0, 0)` is valid — Python's `getaddrinfo` parses the `%zone` suffix and populates the scope_id; passing the scope_id as the 4th tuple element (e.g., from `socket.if_nametoindex("eth0")`) is equally valid.
- The static link-local example `ip -6 addr add fe80::1/64 dev eth0 scope link` works but note that on many kernels the automatically generated link-local remains assigned alongside the static one unless removed. This is a usage caveat, not a correctness issue.
- The solicited-node multicast pattern `ff02::1:ff<last 24 bits>` is correctly described per RFC 4291 §2.7.1.
