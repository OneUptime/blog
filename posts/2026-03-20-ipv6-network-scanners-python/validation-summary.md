# Validation Summary: How to Build IPv6 Network Scanners in Python - A Practical Guide

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- Python
- Scapy
- Linux `ip` neighbor cache tooling
- DNS and `dig`
- ICMPv6, NDP, and SLAAC

## Sources Consulted
- Python `ipaddress` library documentation: https://docs.python.org/3.15/library/ipaddress.html
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy 2.7.0 documentation PDF: https://scapy.readthedocs.io/_/downloads/en/stable/pdf/
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://datatracker.ietf.org/doc/html/rfc4443
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://datatracker.ietf.org/doc/html/rfc8064
- BIND 9 `dig` manual page: https://bind9.readthedocs.io/en/v9.18.38/manpages.html
- Local CLI help output: `ip -6 neigh help`
- Local CLI help output: `dig -h`

## Issues Found
- The post described the NDP neighbor table as "who the router knows". `ip -6 neigh show` reads the local host's neighbor cache, so I updated the discovery-method bullet, section intro, and conclusion to describe the local kernel cache accurately.
- The NDP display example labeled every non-link-local address as `global`. That is incorrect for unique-local and other non-global IPv6 ranges, so I changed the example to classify `link-local`, `global`, and `other`.
- The multicast scanner used unscoped `ff02::1` and filtered replies to `link-local` or `global` addresses only. I updated the example to use `ff02::1%<interface>` and to accept any valid IPv6 reply, which avoids dropping unique-local addresses.
- The EUI-64 example used an invalid IPv6 prefix (`2001:db8:home:1::/64`) and built addresses incorrectly for compressed prefixes. I replaced the example prefix with a valid `/64`, enforced IPv6 `/64` input, and combined the prefix and interface identifier numerically.
- The SLAAC prediction text implied MAC-based prediction generally. I narrowed it to modified EUI-64-based SLAAC, which matches RFC 4291, and reflects the current RFC 8064 guidance that stable IIDs should not default to embedded link-layer addresses.
- The discovery-method list said `DNS PTR records (ip6.arpa zone walking)`, which overstated what the code actually does. I corrected it to AAAA/PTR lookups for known hosts.

## Review Notes
- Scapy's packet-building syntax and `multi=True` behavior were checked against current Scapy documentation. The raw multicast probe itself was not executed end-to-end because it depends on available interfaces and raw-packet privileges in the local environment.
- The DNS helper logic was spot-checked locally with `dig`, and the SLAAC helper was executed locally against both documentation and unique-local `/64` prefixes.
- Modern operating systems commonly use RFC 7217/RFC 8064-style stable or privacy-oriented interface identifiers instead of modified EUI-64, so the EUI-64 technique is situational rather than universal.
