# Validation Summary: How to Understand IPv6 Security Filtering Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- SLAAC
- Multicast Listener Discovery (MLD)
- `ip6tables`
- `nftables`
- IPv6 extension headers / Routing Header Type 0

## Sources Consulted
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://datatracker.ietf.org/doc/html/rfc4890
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 3810, Multicast Listener Discovery Version 2 (MLDv2) for IPv6: https://datatracker.ietf.org/doc/rfc3810/
- RFC 5095, Deprecation of Type 0 Routing Headers in IPv6: https://datatracker.ietf.org/doc/html/rfc5095
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- `nftables` official manual: https://netfilter.org/projects/nftables/manpage.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help and inspection: `ip6tables -p icmpv6 -h`, `ip6tables -m hl -h`, `ip6tables -m rt -h`, `ip6tables-translate`, `nft describe icmpv6 type`, and `nft describe meta l4proto`

## Issues Found
- The RFC 4890 section conflated transit filtering guidance with host/local-link control traffic. I corrected the tables so that NDP, MLD, Redirect, Mobile IPv6, and SEND are categorized in line with RFC 4890.
- The original NDP rules incorrectly required Router Solicitations, Neighbor Solicitations, and Neighbor Advertisements to come from `fe80::/10`. I changed the examples to validate `Hop Limit = 255` and to restrict only Router Advertisements to link-local sources, which matches RFC 4861.
- The generic bogon source list treated `fc00::/7` and `fe80::/10` as universal bogons. I removed those blanket drops from the host-oriented examples and clarified that ULA and link-local filtering should be scoped to untrusted or perimeter-facing interfaces.
- The `nftables` example matched ICMPv6 with `ip6 nexthdr`, which the official `nftables` manual warns does not reliably match packets when IPv6 extension headers are present. I rewrote the rules to use `icmpv6 type` and `meta l4proto ipv6-icmp`.
- The base policy dropped all remaining ICMPv6 without allowing MLD queries used by hosts that participate in IPv6 multicast. I added an explicit MLD query allowance to the examples.

## Review Notes
- The firewall snippets are host-oriented base policies. Routers, bridges, or multicast-heavy systems may need additional inbound allowances beyond the MLD query rule shown here.
- The local environment reports `ip6tables v1.8.10 (nf_tables)`, so the `ip6tables` example is using the nftables-backed frontend commonly shipped on current Linux distributions.
