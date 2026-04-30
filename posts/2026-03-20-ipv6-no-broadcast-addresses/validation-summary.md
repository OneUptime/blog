# Validation Summary: How to Understand Why IPv6 Has No Broadcast Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Neighbor Discovery Protocol (NDP)
- Multicast Listener Discovery (MLD)
- DHCPv6
- OSPFv3
- RIPng
- Python `ipaddress`
- Linux `iproute2`

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture — https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://datatracker.ietf.org/doc/html/rfc4861
- RFC 3810: Multicast Listener Discovery Version 2 (MLDv2) for IPv6 — https://datatracker.ietf.org/doc/rfc3810/
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://datatracker.ietf.org/doc/html/rfc8415
- RFC 5340: OSPF for IPv6 — https://datatracker.ietf.org/doc/html/rfc5340
- RFC 2080: RIPng for IPv6 — https://datatracker.ietf.org/doc/html/rfc2080
- Python standard library docs for `ipaddress` — https://docs.python.org/3.15/library/ipaddress.html
- `ip-maddress(8)` man page for `iproute2` — https://manpages.debian.org/testing/iproute2/ip-maddress.8.en.html

## Issues Found
- The router discovery row was incorrect. Router Solicitations go to `ff02::2`, but Router Advertisements are sent to `ff02::1` or unicast from the router's link-local address. The table was corrected to reflect that behavior from RFC 4861.
- The table treated OSPF and RIP examples as IPv4 broadcast replacements, which was misleading because these are multicast-based routing protocols. The table header and those rows were corrected to describe protocol equivalents instead.
- The DHCPv6 multicast group description was imprecise. `ff02::1:2` is the `All_DHCP_Relay_Agents_and_Servers` group, not just “all DHCP agents”.
- The solicited-node discussion overstated how uniquely hosts map to groups. The text and comments were corrected to say that addresses sharing the same low-order 24 bits join the same group, and that multiple addresses can map to one solicited-node group.
- The performance example overstated the expected host count per solicited-node group and implied complete interruption avoidance. It was revised to match RFC 4861 more closely by describing the 2^24-group spread and reduced interrupts on non-target hosts.
- The section claiming every IPv6 address in a `/64` is usable as a host address was inaccurate because IPv6 defines the subnet-router anycast address with an all-zero interface ID. The text and Python example were corrected to focus on the absence of an all-ones broadcast address rather than claiming universal host usability.
- The AWS VPC example in the ARP scaling bullet was removed because it was too environment-specific for a standards-based explanation and not needed for the technical point.

## Review Notes
- The `ip -6 maddr show dev eth0` example is valid for Linux `iproute2`; command syntax was also verified locally with `ip -6 maddr help` and `ip -6 maddr show dev lo`.
- The DHCPv6 example is technically correct, but many IPv6 deployments use Router Advertisements and SLAAC for address assignment, with DHCPv6 used for additional configuration or stateful addressing where needed.
