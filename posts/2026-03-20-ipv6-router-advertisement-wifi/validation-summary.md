# Validation Summary: How to Configure IPv6 Router Advertisement over Wi-Fi

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 Router Advertisements
- `radvd`
- Wi-Fi
- SLAAC
- DHCPv6
- Neighbor Discovery Protocol (NDP)
- `ip6tables`
- `ebtables`
- `tcpdump`
- `rdisc6`

## Sources Consulted
- `radvd` upstream documentation and man pages: https://radvd.litech.org/
- `radvd.conf(5)` upstream source: https://raw.githubusercontent.com/radvd-project/radvd/master/radvd.conf.5.man
- `radvdump(8)` upstream source: https://raw.githubusercontent.com/radvd-project/radvd/master/radvdump.8.man
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6105, IPv6 Router Advertisement Guard: https://datatracker.ietf.org/doc/html/rfc6105
- RFC 7113, Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard): https://datatracker.ietf.org/doc/html/rfc7113
- RFC 7772, Reducing Energy Consumption of Router Advertisements: https://datatracker.ietf.org/doc/html/rfc7772
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106
- Linux kernel `accept_ra` documentation: https://docs.kernel.org/networking/ip-sysctl.html
- NDisc6 project documentation (`rdisc6`): https://www.remlab.net/ndisc6/
- Local CLI and man-page checks in the review environment: `ip6tables --help`, `ebtables(8)`, `tcpdump -h`, `ip route help`

## Issues Found
- The example prefix `2001:db8:wifi::/64` was not a valid IPv6 prefix because `wifi` is not hexadecimal. It was corrected to the documentation prefix `2001:db8:100::/64`.
- The RDNSS and DNSSL comments cited RFC 6106. Those comments were updated to RFC 8106, which obsoletes RFC 6106 and is the current standards-track reference for DNS configuration via Router Advertisements.
- The section titled `RA Flags Explained` mixed Router Advertisement header flags (`M`, `O`) with Prefix Information Option flags (`A`, `L`). The wording was corrected to `RA and Prefix Flags Explained`.
- The Linux RA-Guard examples were misleading or incorrect as written. The host-local `ip6tables` example was clarified as host protection, the `ebtables` bridge example was corrected to filter on the client-facing Wi-Fi interface and to use `ipv6-icmp`, and the `ip6tables` log/drop example was fixed so the logging rule is evaluated before the drop rule.
- The monitoring and best-practices guidance overstated a few behaviors. The `accept_ra` note was corrected to reflect Linux host-versus-forwarding behavior, the `radvdump` comment was softened so it does not imply validation of outbound advertisements, and the Wi-Fi timer guidance was revised to align with RFC 7772 instead of implying that 30-second multicast RA intervals are universally required.
- The `cat >> /etc/radvd.conf` snippet would append a second full `interface` block and could produce an invalid or confusing configuration. It was replaced with a plain configuration example.

## Review Notes
- RA Guard is fundamentally a Layer-2 protection mechanism. Host-local firewall rules protect the local machine, while bridge or switch policies are what protect other clients on the Wi-Fi segment.
- RFC 7113 notes that RA-Guard implementations need to correctly parse the IPv6 header chain to avoid evasion via extension headers or fragmentation.
- The corrected `radvd` examples are standards-compliant, but client support for RDNSS and DNSSL can still vary by operating system and network manager version.
