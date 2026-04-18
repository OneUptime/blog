# Validation Summary: How to Troubleshoot Path MTU Discovery (PMTUD) Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Path MTU Discovery (PMTUD) — RFC 1191
- ICMP (Type 3 Code 4 — Fragmentation Needed)
- TCP MSS clamping
- iptables (filter and mangle tables, TCPMSS target)
- nftables
- Linux networking tools: `ping`, `tracepath`, `tcpdump`, `ip link`, `scp`
- Interface MTU configuration (Debian `/etc/network/interfaces`, RHEL `ifcfg-*`)

## Sources Consulted
- RFC 1191 — Path MTU Discovery: https://datatracker.ietf.org/doc/html/rfc1191
- RFC 792 — Internet Control Message Protocol (ICMP types/codes): https://datatracker.ietf.org/doc/html/rfc792
- iptables-extensions(8) — TCPMSS target, `--clamp-mss-to-pmtu`, `--set-mss`: https://ipset.netfilter.org/iptables-extensions.man.html
- iptables(8) `--icmp-type` valid names (confirmed `fragmentation-needed` is valid)
- nftables wiki — ICMP matching syntax: https://wiki.nftables.org/wiki-nftables/index.php/Matching_packet_headers
- iputils `ping(8)` — `-M do` (DF), `-s` payload size: https://manpages.debian.org/ping
- iputils `tracepath(8)` — `-n`, pmtu output: https://manpages.debian.org/tracepath
- tcpdump/pcap-filter(7) — BPF byte-offset filters like `icmp[0] = 3`: https://www.tcpdump.org/manpages/pcap-filter.7.html
- ip-link(8) — `mtu` option: https://man7.org/linux/man-pages/man8/ip-link.8.html

## Issues Found
No technical issues found.

Verified specifically:
- `ping -M do -s 1472` produces a 1500-byte IPv4 packet (1472 ICMP payload + 8 ICMP header + 20 IP header); the post's `1472+28=1500` arithmetic is correct.
- IPv4 IP (20 bytes) + TCP (20 bytes) = 40 bytes overhead; `1400 - 40 = 1360` MSS math is correct.
- `iptables --icmp-type fragmentation-needed` is a valid name alias for ICMP type 3 code 4.
- `iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu` is the canonical MSS clamping rule.
- `tcpdump` filter `'icmp[0] = 3 and icmp[1] = 4'` correctly matches Destination Unreachable / Fragmentation Needed.
- `tracepath -n` does print `pmtu` values at each hop where the MTU decreases.

## Review Notes
- The nftables rules accept `icmp type destination-unreachable` broadly, which is slightly wider than the iptables equivalent (`fragmentation-needed` is code 4 of type 3). Both are technically valid; the nftables version could be tightened with `icmp type destination-unreachable icmp code frag-needed accept` if the author wants exact parity, but as written it is not incorrect.
- The post scopes itself to IPv4 / PMTUD via ICMPv4. IPv6 PMTUD uses ICMPv6 "Packet Too Big" (type 2) and works differently (no fragmentation by routers); this is out of scope per the post's IPv4 tag, which is fine.
- The `iptables -I OUTPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT` rule is primarily useful when the host is acting as a router/forwarder; for pure end-hosts it is usually not required but does no harm.
- `--clamp-mss-to-pmtu` reads the route's PMTU (not a path discovered dynamically at rule-evaluation time); this is a minor nuance that doesn't affect correctness of the advice.
