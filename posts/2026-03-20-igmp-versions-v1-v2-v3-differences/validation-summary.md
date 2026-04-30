# Validation Summary: How to Understand IGMP Versions (v1, v2, v3) and Their Differences

## Status
validated

## Post Type
Guide

## Technologies Covered
- IGMPv1, IGMPv2, and IGMPv3
- IPv4 multicast
- Source-Specific Multicast (SSM)
- Linux multicast host configuration and inspection
- `tcpdump`
- `iproute2` (`ip maddr`)

## Sources Consulted
- RFC 1112, *Host Extensions for IP Multicasting*: https://www.rfc-editor.org/info/rfc1112
- RFC 2236, *Internet Group Management Protocol, Version 2*: https://www.rfc-editor.org/info/rfc2236
- RFC 9776, *Internet Group Management Protocol, Version 3*: https://www.rfc-editor.org/info/rfc9776
- RFC 4607, *Source-Specific Multicast for IP*: https://www.rfc-editor.org/info/rfc4607
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local command help checked for command validity: `tcpdump --help`, `ip maddr help`

## Issues Found
- The post cited IGMPv3 as RFC 3376. I updated it to RFC 9776 because RFC 9776 obsoleted RFC 3376 in March 2025 and is the current IGMPv3 specification.
- The IGMPv1 section said routers wait for a “Membership Report Timer” to expire. I corrected this to describe membership state aging out after queries go unanswered, which matches RFC 1112 behavior.
- The IGMPv1 section claimed a default 60-second query interval. I changed this to the RFC 1112 wording that queries are normally sent no more than once a minute.
- The IGMPv3 Group Record table used two non-standard record names (`CHANGE_TO_INCLUDE`, `CHANGE_TO_EXCLUDE`) and oversimplified some meanings. I replaced them with the standard RFC 9776 names and corrected the descriptions.
- The Linux detection section implied `cat /proc/net/igmp` directly reads the configured version for one interface. I revised it to distinguish IGMP state inspection from reading a forced configured version via `force_igmp_version`.
- The conclusion attributed low-leave-latency behavior specifically to IGMPv3. I corrected it so IGMPv3 is recommended for source filtering and SSM while low leave latency is not presented as a v3-only improvement.
- The packet-capture note now treats `tcpdump` decode strings as typical examples rather than fixed output text, which is more accurate across `tcpdump` versions.

## Review Notes
On Linux, `net.ipv4.conf.<iface>.force_igmp_version=0` means automatic behavior with fallback when older-version queriers are present, so the effective host behavior on an interface can change based on received queries. IPv6 multicast membership uses MLD rather than IGMP.
