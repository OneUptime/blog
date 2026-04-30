# Validation Summary: How to Understand IPv6 Fragmentation Attacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- tcpdump and libpcap capture filters
- ip6tables
- nftables
- Suricata
- Snort
- Linux `sysctl` fragment reassembly tuning
- Scapy

## Sources Consulted
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200
- RFC 7112, Implications of Oversized IPv6 Header Chains: https://www.rfc-editor.org/rfc/rfc7112
- RFC 5722, Handling of Overlapping IPv6 Fragments: https://www.rfc-editor.org/rfc/rfc5722
- RFC 6946, Processing of IPv6 "Atomic" Fragments: https://www.rfc-editor.org/rfc/rfc6946
- RFC 8021, Generation of IPv6 Atomic Fragments Considered Harmful: https://www.rfc-editor.org/rfc/rfc8021
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables man page: https://netfilter.org/projects/nftables/manpage.html
- Suricata rule documentation: https://docs.suricata.io/en/latest/rules/header-keywords.html
- Suricata payload keyword documentation: https://docs.suricata.io/en/latest/rules/payload-keywords.html
- Snort 3 rule header documentation: https://docs.snort.org/rules/headers/protocols
- Snort 3 `fragbits` documentation: https://docs.snort.org/rules/options/non_payload/fragbits
- Snort 3 `fragoffset` documentation: https://docs.snort.org/rules/options/non_payload/fragoffset
- Scapy IPv6 API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Local CLI help/output checked during review: `ip6tables -m frag -h`, `ip6tables -m length -h`, and `sysctl -a | rg '^net\\.ipv6\\.ip6frag_'`

## Issues Found
- The IPv4/IPv6 comparison table conflated IPv4's 576-byte reassembly requirement with IPv6's 1280-byte minimum link MTU, and it overstated IPv6 Path MTU Discovery as mandatory. I changed the row labels and values to reflect the actual standards language.
- The tiny-fragment example incorrectly said the firewall could not determine the destination port, even though the first 8 bytes of a TCP header include both source and destination ports. I corrected the explanation and fragment breakdown.
- The overlapping-fragment section described differing OS reassembly behavior as if it were current IPv6 behavior. I updated it to note that RFC 5722 and RFC 8200 require overlapping IPv6 fragment sets to be discarded, while preserving the historical attack context.
- The atomic-fragment section incorrectly used Router Advertisements with MTU values below 1280 as the trigger. Per RFC 6946 and RFC 8021, the relevant trigger is a forged ICMPv6 Packet Too Big message advertising an MTU smaller than 1280. I corrected the attack description and RFC references.
- The `tcpdump` fragment-detection filters treated `ip6[6]==44` as if it detected all IPv6 fragments. `pcap-filter(7)` documents that `ip6 proto` does not walk the IPv6 header chain, so I changed the general capture rule to `ip6 protochain 44` and added caveats to the fixed-offset filters.
- The Suricata/Snort examples relied on `alert ipv6` and `ip_proto:44` in a way that was not a robust cross-engine fragment example. I replaced them with IPv6-address-scoped `fragbits` and `fragoffset` rules that match first fragments directly, and adjusted the tiny-fragment heuristic accordingly.
- The `ip6tables` fragment rule was wrong: `--fragid 0 --fragmore` matches a fragment ID value, not non-initial fragments. I replaced it with `! --fragfirst`, which matches the intended behavior according to `iptables-extensions(8)`.
- The `nftables` examples used invalid `frag exists` syntax. I corrected them to `exthdr frag exists` based on the nftables man page.
- The RFC 7112 test command used `hping3` in a way that would not actually craft the malformed IPv6 fragment sequence being described. I replaced it with a Scapy example that builds two fragments sharing an identification value, with only the first 8 bytes of the TCP header in the first fragment.
- The RFC 7112 header-order explanation implied that all extension headers precede the Fragment header. I corrected the sequence so it reflects the actual first-fragment layout described in RFC 8200 and RFC 7112.

## Review Notes
- The post now explicitly notes where fixed-offset `tcpdump` filters only work when the Fragment header immediately follows the IPv6 header. That limitation comes from libpcap filter semantics, not from the attack model itself.
- The Linux `ip6frag_*` sysctl names and example values are valid. The review host reported `net.ipv6.ip6frag_high_thresh=4194304`, `net.ipv6.ip6frag_low_thresh=3145728`, and `net.ipv6.ip6frag_time=60`; exact defaults can vary by kernel and distribution.
