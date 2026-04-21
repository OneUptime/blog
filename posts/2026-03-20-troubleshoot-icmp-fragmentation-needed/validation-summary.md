# Validation Summary: How to Troubleshoot ICMP Fragmentation Needed Messages - Troubleshoot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ICMPv4 Destination Unreachable / Fragmentation Needed messages
- IPv4 Path MTU Discovery (PMTUD)
- Linux networking tools: `tcpdump`, `ping`, `ip`, `ss`
- `iptables` ICMP filtering
- `nftables` ICMP filtering
- Wireshark display filters
- MTU, PMTU, and TCP MSS troubleshooting

## Sources Consulted
- RFC 1191: Path MTU Discovery - https://www.rfc-editor.org/rfc/rfc1191
- RFC 1812: Requirements for IP Version 4 Routers - https://www.ietf.org/rfc/inline-errata/rfc1812.html
- RFC 2923: TCP Problems with Path MTU Discovery - https://datatracker.ietf.org/doc/html/rfc2923
- iputils `ping(8)` manual - https://manpages.opensuse.org/Tumbleweed/iputils/ping.8.en.html
- iproute2 `ip-route(8)` manual - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ip(7)` manual for PMTUD behavior - https://www.man.he.net/man7/ip
- Wireshark ICMP display filter reference - https://www.wireshark.org/docs/dfref/i/icmp.html
- nftables wiki quick reference and netfilter nftables man page - https://wiki.nftables.org/wiki-nftables/index.php/Quick_reference-nftables_in_10_minutes and https://www.netfilter.org/projects/nftables/manpage.html
- `iptables-extensions(8)` manual - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI verification: `tcpdump -d`, `ping -h`, `ip route help`, `iptables -p icmp -h`, and `nft describe icmp type/code`

## Issues Found
1. **Oversized ping payload exceeded a typical 1500-byte local MTU**: The original `ping -M do -s 1473` creates a 1501-byte IPv4 packet because Linux `ping -s` specifies ICMP payload bytes, and IPv4 ICMP Echo also has 20 bytes of IP header plus 8 bytes of ICMP header. With `-M do`, that can be rejected locally instead of generating a path ICMP type 3 code 4 response. **Fix:** Changed the example to `-s 1373` and documented that it targets a 1400-byte bottleneck on a 1500-byte local link.
2. **Invalid `ip route` command**: `ip route cache show` is not valid iproute2 syntax. **Fix:** Replaced it with `ip route get 10.20.0.5`, which is the appropriate command in the post for querying the route/PMTU entry.
3. **Black hole diagnosis comments were too absolute**: The original comments treated absence or presence of ICMP in one capture as conclusive. **Fix:** Clarified that missing ICMP after oversized packets leave indicates a likely black hole, and receiving ICMP confirms PMTUD signaling is flowing.
4. **nftables rules allowed all destination-unreachable ICMP codes**: The post said it was allowing Fragmentation Needed specifically, but `icmp type destination-unreachable accept` allows all ICMP type 3 codes. **Fix:** Added `icmp code frag-needed` to the nftables rules.
5. **Incorrect RFC reference for IPv4 PMTUD firewall guidance**: The post cited RFC 4890, which is about ICMPv6 filtering. **Fix:** Changed the IPv4 references to RFC 1191/RFC 1812 and adjusted the conclusion to say type 3 code 4 should be allowed.

## Review Notes
- The tcpdump capture filter `icmp[0] = 3 and icmp[1] = 4` compiles correctly and matches IPv4 ICMP Destination Unreachable / Fragmentation Needed messages.
- Wireshark fields `icmp.type`, `icmp.code`, and `icmp.mtu` are valid for current Wireshark versions.
- The iptables `--icmp-type fragmentation-needed` name is valid for IPv4 ICMP and maps to Destination Unreachable code 4.
