# Validation Summary: How to Troubleshoot IPv6 Link-Local Address Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 link-local addressing
- Neighbor Discovery Protocol (NDP) and SLAAC
- Linux networking tools (`ip`, `ping6`, `ndisc6`, `traceroute6`)
- Python `socket` API for IPv6 scoped addresses

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 4007: IPv6 Scoped Address Architecture - https://www.rfc-editor.org/rfc/rfc4007.html
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 6874: IPv6 Zone IDs in URIs - https://www.rfc-editor.org/rfc/rfc6874
- `ip-address(8)` Linux manual - https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-route(8)` Linux manual - https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ping(8)` Linux manual - https://man7.org/linux/man-pages/man8/ping.8.html
- `ipv6(7)` Linux manual - https://man7.org/linux/man-pages/man7/ipv6.7.html
- Python `socket` module documentation - https://docs.python.org/3.11/library/socket.html
- `ndisc6(8)` manual - https://www.mankier.com/8/ndisc6
- Local `ip -6 ... help`, `man ping`, `man ip-address`, and `man ip-route` output on the review system

## Issues Found
- The introduction said every IPv6-enabled interface automatically gets a link-local address and implied link-local addresses are required for all same-link communication. I corrected this to the more accurate Linux/IPv6 behavior: non-loopback interfaces normally auto-configure a link-local address, link-local addresses are required for NDP and router discovery, and they can be used for same-link communication.
- The scope ID section treated `%eth0` as universally mandatory and gave a specific failure mode for `ping6 fe80::1`. Current Linux `ping` documentation and behavior are less absolute, so I changed the text to say scope IDs are often needed to avoid ambiguity and that omitting them can fail or choose the wrong interface depending on the tool and system.
- The default-gateway section said the interface "must" be specified for `ping6 -I eth0 fe80::1`. I kept the explicit-interface example but changed the wording to reflect that it is the unambiguous, recommended form rather than a universal protocol requirement.
- The duplicate-address section assumed link-local addresses are MAC-derived and recommended assigning a custom replacement address after DAD failure. RFC 4862 is more nuanced and warns that if the failed address was auto-generated from a hardware-derived identifier, duplicate MACs or cloned NIC identities should be investigated first. I updated the explanation and replaced the invalid placeholder deletion command with a concrete manual-address example.

## Review Notes
- The commands are Linux-oriented and technically correct for that context, but `ndisc6` and `traceroute6` may not be installed by default on every distribution.
- `ping6` remains valid on current Linux systems, though some environments prefer the equivalent `ping -6` form.
