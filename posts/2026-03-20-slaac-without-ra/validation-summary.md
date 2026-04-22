# Validation Summary: How IPv6 Link-Local Addresses Work Without Router Advertisements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 link-local addressing
- SLAAC
- Neighbor Discovery Protocol (NDP)
- Duplicate Address Detection (DAD)
- Linux IPv6 address configuration
- OSPFv3
- RIPng
- BGP over IPv6 link-local addressing
- DHCPv6
- Cisco IOS IPv6 interface configuration
- Junos OS IPv6 interface configuration

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4007, IPv6 Scoped Address Architecture: https://datatracker.ietf.org/doc/html/rfc4007
- RFC 5340, OSPF for IPv6: https://datatracker.ietf.org/doc/html/rfc5340
- RFC 2080, RIPng for IPv6: https://datatracker.ietf.org/doc/html/rfc2080
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- RFC 8950, Advertising IPv4 NLRI with an IPv6 Next Hop: https://www.rfc-editor.org/rfc/rfc8950
- Linux kernel IP sysctl documentation for `addr_gen_mode`: https://www.kernel.org/doc/html/v5.13/networking/ip-sysctl.html
- Local `ip -6 addr help` and `ping6 -h` output
- Cisco, Understand the IPv6 Link-Local Address: https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/113328-ipv6-lla.html
- Juniper, IPv6 Neighbor Discovery for Junos OS: https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html

## Issues Found
- Corrected "router prefix delegation" to "router-advertised prefixes" because SLAAC global addresses come from Router Advertisement Prefix Information Options, not DHCPv6 Prefix Delegation.
- Changed the generated link-local address example from `/10` to `/64` for the interface address format while retaining `fe80::/10` as the address type prefix.
- Clarified that interface identifiers may be EUI-64, stable privacy, or OS-specific, rather than only EUI-64 or random privacy identifiers.
- Clarified Router Solicitation source address behavior: RS can use the link-local address if assigned, or `::` when no address is assigned yet.
- Replaced absolute "ALWAYS assigned" wording with "normally assigned" to account for disabled IPv6, suppressed link-local generation, or DAD failure.
- Changed DAD uniqueness wording from "guaranteed" to "checked by DAD when enabled" because DAD can be disabled and is not completely reliable.
- Corrected NDP usage wording so Router Advertisements are described as using link-local source addresses, while RS/NS can use `::` before an address is assigned.
- Corrected the default gateway explanation: hosts learn the default router from the RA's link-local source address.
- Corrected the DHCPv6 statement from relay agents using link-local as source to clients using link-local to reach on-link servers or relays.
- Replaced the interface-identification command with `ip -o -6 addr show scope link`, which shows the interface name on the same line as the link-local address.
- Fixed Linux `addr_gen_mode` comments: mode `1` suppresses link-local generation, mode `2` uses stable privacy, and mode `0` is EUI-64 generation.
- Changed manual Linux link-local assignment from `fe80::1/10` to `fe80::1/64`.
- Corrected OSPFv3 wording to say Link-LSAs carry link-local addresses for next-hop calculation, instead of saying next-hops are generally in OSPFv3 LSAs.
- Corrected RIPng wording: RIPng updates can specify a link-local next-hop RTE; they are not Router Advertisements.
- Updated the BGP reference from RFC 5549 to RFC 8950 because RFC 8950 obsoletes RFC 5549 for IPv4 NLRI with IPv6 next-hop.

## Review Notes
The post is technically relevant and validated after the corrections above. Future improvements could mention that operating systems and network managers may override kernel defaults for IPv6 address generation, but the current post is accurate at the guide level.
