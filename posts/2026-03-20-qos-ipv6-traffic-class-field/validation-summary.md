# Validation Summary: How to Understand QoS with IPv6 Traffic Class Field

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Differentiated Services (DiffServ / DSCP)
- ECN
- `tcpdump`
- `ip6tables`
- Python raw sockets
- Wireshark
- Linux `sysctl`

## Sources Consulted
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/html/rfc8200
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" - https://datatracker.ietf.org/doc/rfc2474/
- RFC 3168, "The Addition of Explicit Congestion Notification (ECN) to IP" - https://datatracker.ietf.org/doc/html/rfc3168
- RFC 2597, "Assured Forwarding PHB Group" - https://datatracker.ietf.org/doc/rfc2597/
- RFC 3246, "An Expedited Forwarding PHB (Per-Hop Behavior)" - https://datatracker.ietf.org/doc/html/rfc3246
- RFC 4594, "Configuration Guidelines for DiffServ Service Classes" - https://datatracker.ietf.org/doc/html/rfc4594
- IANA Differentiated Services Field Codepoints (DSCP) Registry - https://www.iana.org/assignments/dscp-registry/dscp-registry.xhtml
- Wireshark Display Filter Reference for IPv6 - https://www.wireshark.org/docs/dfref/i/ipv6.html
- `iptables-extensions(8)` manual - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel IP sysctl documentation - https://docs.kernel.org/6.2/networking/ip-sysctl.html
- `pcap-filter(7)` manual - https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local command help checked during review: `ip6tables -j DSCP -h`, `ip6tables -p icmpv6 -h`, `ip6tables -m multiport -h`, `tcpdump --help`, `tcpdump -d 'ip6 and (ip6[0:2] & 0x30) != 0'`

## Issues Found
- The post conflated the 6-bit DSCP value with the full 8-bit IPv6 Traffic Class octet in the `tcpdump` example. I corrected the example from `0x2e` to `0xb8` for EF with `ECN=00`, and clarified why.
- The Wireshark display filter used `ipv6.dsfield.dscp`, which is not the current IPv6 field name in supported Wireshark versions. I corrected it to `ipv6.tclass.dscp`.
- The DSCP description block implied that the listed CS names were intrinsic meanings. I adjusted the wording to make them common service-class mappings and corrected `CS7` to "Reserved for future use" per RFC 4594 guidance.
- The `ip6tables` examples mismatched the traffic classes being described. I changed SIP on UDP/5060 from `EF` to `CS5`, replaced the `CS7` network-control example with `CS6` for BGP routing traffic, aligned the remaining example comments/classes with common RFC 4594 mappings, and used `multiport --ports` so the `OUTPUT` examples match service traffic in either source/destination port direction.
- The ECN verification example relied on grepping for `ECN` in `tcpdump` output, which is not a reliable current check. I replaced it with an explicit BPF filter that matches non-zero ECN bits in the IPv6 Traffic Class field.
- The header diagram block was fenced as `yaml` even though it is plain text, so I changed it to `text`.
- The introduction and closing paragraph used "DSCP field" where the correct 8-bit term is the IPv4/IPv6 DS field. I corrected that terminology.

## Review Notes
- The Python raw-socket example is technically correct on Linux, but it is Linux-specific (`AF_PACKET`) and requires elevated privileges or equivalent capabilities.
- The `ip6tables` examples are valid on current Linux systems; however, many modern distributions use the nftables backend underneath `ip6tables`, so a future revision could also show equivalent `nft` rules.
- RFC 4594 is informational guidance, not a hard requirement for every network. The corrected post now presents those names as common mappings rather than universal semantics.
