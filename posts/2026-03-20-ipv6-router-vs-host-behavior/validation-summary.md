# Validation Summary: How to Understand IPv6 Router vs Host Behavior

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6 Neighbor Discovery
- Router Advertisements (RA)
- Router Solicitations (RS)
- Linux `sysctl`
- `iproute2`
- `radvd`
- `tcpdump`

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `radvd.conf(5)` man page: https://manpages.ubuntu.com/manpages/jammy/man5/radvd.conf.5.html
- `pcap-filter(7)` man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local command help checked for `ip`, `sysctl`, and `tcpdump`

## Issues Found
- The comparison table referred to `ip6_forwarding`, which is not the Linux sysctl name used in the post. It was corrected to `net.ipv6.conf.all.forwarding` to match the kernel documentation.
- The host behavior section incorrectly tied SLAAC to `M=0, O=0`. SLAAC is controlled by the Prefix Information option's `A` flag, while `M` and `O` indicate DHCPv6-provided configuration. The wording was corrected accordingly.
- The post stated unconditionally that routers do not send Router Solicitations. On Linux, a forwarding node with `accept_ra=2` will still accept RAs and transmit RS on that interface. The relevant table entries and summary were corrected to say this is the default behavior, not an absolute rule.
- The redirect explanation was too narrow. RFC 4861 redirects can point to a better first-hop node or indicate that the destination is directly on-link, so the wording was corrected.
- The host behavior line saying a host "drops packets not addressed to itself" was too broad. It was corrected to the precise forwarding behavior: a host does not forward packets not addressed to itself.

## Review Notes
- The `radvd` example syntax and options are valid as written.
- The command examples for `sysctl`, `ip -6 route show default`, and `tcpdump` are syntactically valid.
