# Validation Summary: How to Understand the IPv6 Unspecified Address (::/128)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- IPv6 Neighbor Discovery and Duplicate Address Detection (DAD)
- DHCPv6
- `tcpdump` / libpcap capture filters
- Linux `iproute2`
- Python `socket`
- Python `ipaddress`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://datatracker.ietf.org/doc/html/rfc8415
- Python `socket` documentation - https://docs.python.org/3.11/library/socket.html
- Python `ipaddress` documentation - https://docs.python.org/3/library/ipaddress.html
- `pcap-filter(7)` manual - https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ipv6(7)` manual - https://www.man7.org/linux/man-pages/man7/ipv6.7.html
- `ip-route(8)` manual - https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The introduction incorrectly said the unspecified address is used as a DHCPv6 source address before a real address is available. I changed this to describe its actual early-initialization role, centered on DAD, because RFC 8415 expects DHCPv6 to use link-local addressing on usable IPv6 interfaces.
- The DAD `tcpdump` example was technically wrong. `ip6[8]=0` does not test the IPv6 hop limit, and the comment about hop limit 255 was incorrect. I replaced the filters with valid libpcap expressions that match ICMPv6 traffic sourced from `::`, including a DAD-focused solicited-node multicast filter.
- The DHCPv6 section incorrectly claimed initial Solicit messages use `::` as the source address. I corrected the explanation and the capture example to use a link-local source and the standard `ff02::1:2` multicast destination.
- The routing section incorrectly claimed `ip -6 route get ::` should fail with `Address not available`. On the review system, that lookup succeeded, and the result is system-dependent. I removed the incorrect claim and kept the routing distinction focused on `::/128` versus `::/0`.
- The Python `ipaddress` example incorrectly asserted that `IPv6Address('::').is_private` is `False`. Current Python behavior does not match that claim, so I replaced the example with `is_global`, which is accurate and directly relevant here.
- The `Application Validation` Python snippet was missing `import ipaddress`. I added the missing import so the example runs as written.
- The dual-stack wildcard bind note needed a portability caveat. I clarified that `IPV6_V6ONLY = 0` enables IPv4-mapped acceptance on platforms that support dual-stack IPv6 sockets.

## Review Notes
- The corrected Python snippets compile successfully.
- The corrected `tcpdump` capture filters compile successfully with `tcpdump -d`.
- Dual-stack behavior for `IPV6_V6ONLY` remains platform-dependent; the post now states that explicitly.
