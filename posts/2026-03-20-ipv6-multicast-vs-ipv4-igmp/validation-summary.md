# Validation Summary: How to Understand IPv6 Multicast vs IPv4 Multicast (IGMP)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 multicast
- IPv6 multicast
- IGMPv1, IGMPv2, IGMPv3
- MLDv1, MLDv2
- PIM-SM and PIM-SSM
- Linux multicast inspection tools (`ip`, `tcpdump`, `/proc/net/igmp`, `/proc/net/igmp6`)

## Sources Consulted
- RFC 9776: Internet Group Management Protocol, Version 3 - https://datatracker.ietf.org/doc/html/rfc9776
- RFC 9777: Multicast Listener Discovery Version 2 (MLDv2) for IPv6 - https://datatracker.ietf.org/doc/html/rfc9777
- RFC 3590: Source Address Selection for the Multicast Listener Discovery (MLD) Protocol - https://datatracker.ietf.org/doc/html/rfc3590
- RFC 4607: Source-Specific Multicast for IP - https://datatracker.ietf.org/doc/rfc4607/
- RFC 2365: Administratively Scoped IP Multicast - https://datatracker.ietf.org/doc/html/rfc2365
- RFC 4291: IP Version 6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3956: Embedding the Rendezvous Point (RP) Address in an IPv6 Multicast Address - https://datatracker.ietf.org/doc/html/rfc3956
- IANA IPv4 Multicast Address Space registry - https://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
- Linux kernel `/proc` documentation - https://docs.kernel.org/6.12/filesystems/proc.html
- `ip-maddress(8)` - https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- `pcap-filter(7)` - https://man7.org/linux/man-pages/man7/pcap-filter.7.html

## Issues Found
- The RFC references for IGMPv3 and MLDv2 were outdated. RFC 3376 and RFC 3810 were obsoleted in March 2025 by RFC 9776 and RFC 9777, so the comparison table was updated.
- The multicast range section overstated several address ranges. I corrected the IPv4 `239.0.0.0/8` description from organization-local to administratively scoped, added the organization-local `239.192.0.0/14` detail from RFC 2365, and fixed the ASM/SSM comparisons so they do not imply incorrect overlapping or nonexistent IPv6 prefixes.
- The IPv6 scope examples used CIDR-like prefixes where the RFC architecture actually defines scope via a 4-bit scope field. I changed those lines to describe scope values directly.
- The MLD source-address explanation was too absolute. RFC 3590 and RFC 9777 allow MLDv2 Reports to use the unspecified address `::` before a valid link-local address exists, so the text and command commentary were corrected.
- The `tcpdump` example was technically wrong for MLD because MLD packets include a Hop-by-Hop header before ICMPv6, so `icmp6 and ip6[40] == 143` would miss the intended packets. I replaced it with a filter that follows the IPv6 header chain and checks the MLDv2 Report type at the correct offset.
- `/proc/net/igmp6` was described as an IPv6 multicast socket table, but current Linux kernel documentation describes it as the IPv6 multicast addresses joined by the host. That comment was corrected.
- The routing comparison overstated IPv6 Embedded RP as if it replaced MSDP universally. I updated the wording to reflect that IPv6 has no standardized MSDP equivalent and that Embedded RP is an optional ASM mechanism defined by RFC 3956.

## Review Notes
- The `tcpdump` filter was also validated locally with `tcpdump -d` to confirm extension-header handling.
- `ip maddr show` and `ip -6 maddr show` are valid commands on current Linux/iproute2, but `ip-maddress(8)` notes that only static link-layer multicast addresses can be added or deleted directly; the post now uses them only for inspection, which is correct.
