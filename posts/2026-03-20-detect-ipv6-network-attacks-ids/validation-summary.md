# Validation Summary: How to Detect IPv6-Based Network Attacks with IDS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- Router Advertisements (RA)
- Suricata
- tcpdump/libpcap BPF filters
- iptables/ip6tables
- SI6 Networks IPv6 Toolkit (`scan6`)
- THC-IPv6

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 6105, IPv6 Router Advertisement Guard: https://www.rfc-editor.org/rfc/rfc6105
- RFC 7113, Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard): https://www.rfc-editor.org/rfc/rfc7113
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 4380, Teredo: Tunneling IPv6 over UDP through NATs: https://www.rfc-editor.org/rfc/rfc4380
- RFC 7526, Deprecating the Anycast Prefix for 6to4 Relay Routers: https://www.rfc-editor.org/rfc/rfc7526.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- Suricata rules documentation: https://docs.suricata.io/en/latest/rules/
- Suricata header keyword documentation: https://docs.suricata.io/en/latest/rules/header-keywords.html
- `pcap-filter(7)` for BPF filter behavior and `proto`/`protochain` semantics: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Netfilter nftables man page for ICMPv6 symbolic names: https://netfilter.org/projects/nftables/manpage.html
- Local command help and package metadata: `ip6tables -p ipv6-icmp -h`, `nft describe icmpv6 type`, `ip -6 neigh help`, `ip monitor help`, `apt-cache show radvd`, `apt-cache show ipv6toolkit`, `apt-cache show thc-ipv6`

## Issues Found
- The post said to install `radvd` as “RA guard on Linux”. That was incorrect because `radvd` is a Router Advertisement daemon, not RA Guard. I replaced it with an accurate note that RA Guard is typically a switch-side control and added a host-side `ip6tables` logging example instead.
- The original Suricata Router Advertisement rule used `icmp6`, `$EXTERNAL_NET`, and `$HOME_NET` in a way that could miss the common multicast RA case. I replaced it with a neutral `icmpv6 any any -> any any` example that matches ICMPv6 type 134 directly.
- The NDP section said it was detecting Neighbor Advertisements, but the tcpdump filter matched both Neighbor Solicitations and Neighbor Advertisements. I corrected the description to match the actual filter behavior.
- The NDP monitoring examples used `ndpmon`/`ndpwatch` style package assumptions that are not portable for current Ubuntu-style `apt` packaging. I replaced them with the built-in `ip -6 monitor neigh` command.
- The fragmentation tcpdump filter only checked the base IPv6 header’s Next Header field. I changed it to `ip6 protochain 44`, which matches Fragment headers through the IPv6 header chain as documented by `pcap-filter(7)`.
- The original Suricata fragmentation example relied on `ip6-exthdr:frag`, which I could not validate against the official Suricata rule documentation consulted. I replaced it with a documented `ipv6.hdr`-based example and kept the thresholding intent.
- The tunneling example used `proto 41`, which is broader than necessary. I tightened it to `ip proto 41` so the filter explicitly means IPv6-in-IPv4 encapsulation.
- The 6to4 relay check used `192.88.99.1` without noting that the anycast relay mechanism is deprecated. I updated the comment to reflect RFC 7526.
- The amplification section rate-limited all outbound ICMPv6 and then dropped the rest, which is unsafe because ICMPv6 is required for normal IPv6 operation. Per RFC 4890, I narrowed the example to ICMPv6 echo replies only.
- The baseline analysis pipeline used `cut -d. -f1-4`, which is IPv4-oriented and incorrect for IPv6 tcpdump output. I replaced it with a `sed` expression that strips only the trailing port suffix from tcpdump source fields.
- The SIEM log paths were written as fixed locations. I softened that to “common locations; paths vary by installation” because those paths are deployment-specific.

## Review Notes
- The tcpdump byte-offset filters for ICMPv6 Neighbor Discovery (`ip6[40] == ...`) assume there are no extension headers before ICMPv6. That is normal for Router Advertisement and Neighbor Discovery traffic, so the examples are acceptable as practical filters.
- The post mixes detection examples with host-side mitigation and logging rules. That is technically fine, but a future revision could separate “detection” from “response” more explicitly.
