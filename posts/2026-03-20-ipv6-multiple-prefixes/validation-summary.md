# Validation Summary: How to Manage Multiple IPv6 Prefixes on a Host

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SLAAC
- DHCPv6
- Router Advertisements
- Linux `iproute2`
- `systemd-networkd`
- Netfilter (`ip6tables`)

## Sources Consulted
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6724, "Default Address Selection for Internet Protocol Version 6 (IPv6)" - https://datatracker.ietf.org/doc/html/rfc6724
- RFC 4193, "Unique Local IPv6 Unicast Addresses" - https://datatracker.ietf.org/doc/html/rfc4193
- `ip-address(8)` - https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` - https://man7.org/linux/man-pages/man8/ip-route.8.html
- `systemd.network(5)` - https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html

## Issues Found
- The static-address section said to add per-prefix on-link routes even though Linux adds prefix routes automatically unless `noprefixroute` is used. I changed the text to reflect the default behavior and turned the manual route examples into conditional examples.
- The `IPv6PrivacyExtensions=no` comment said it would "Prefer SLAAC-assigned addresses for routing," which is misleading. That setting disables temporary privacy addresses rather than expressing a routing preference, so I corrected the comment to describe stable source selection accurately.
- The ULA example used `fd00::100/64`, which is not a properly formed locally assigned ULA prefix under RFC 4193's pseudo-random Global ID requirement. I replaced it with a realistic example prefix.
- The RA section said each RA prefix adds a new SLAAC address. I narrowed that to autonomous RA prefixes, which is the condition relevant to SLAAC.

## Review Notes
The post is accurate for Linux hosts using `iproute2` and `systemd-networkd`. Host-side selective filtering of individual advertised prefixes remains limited in standard configurations; filtering whole RAs from a specific router is possible, but managing the advertisement at the router is still the cleanest approach.
