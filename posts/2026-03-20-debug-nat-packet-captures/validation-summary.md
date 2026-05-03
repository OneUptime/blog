# Validation Summary: How to Debug NAT Issues with Packet Captures

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- tcpdump (packet capture CLI)
- Wireshark (Follow TCP Stream feature)
- iptables (nat table, PREROUTING/POSTROUTING, LOG target)
- Linux netfilter / conntrack (referenced)
- Scapy (Python packet analysis library: `rdpcap`, `IP`)
- Linux kernel logging (`/var/log/kern.log`)

## Sources Consulted
- tcpdump and pcap-filter manpages: https://www.tcpdump.org/manpages/tcpdump.1.html and https://www.tcpdump.org/manpages/pcap-filter.7.html (verified `-n`, `-i`, `-w`, `-r`, `-v` flags and the `tcp[tcpflags] & tcp-syn != 0` byte-offset filter syntax with `tcp-syn` keyword)
- iptables manpage / netfilter docs: https://ipset.netfilter.org/iptables.man.html (verified `-t nat -I PREROUTING/POSTROUTING`, `-j LOG --log-prefix`, `-D` with rule number)
- netfilter LOG target documentation (verified that LOG in the nat table sees only the first packet of each connection, but correctly shows pre-NAT IPs in PREROUTING and post-NAT IPs in POSTROUTING)
- Scapy documentation: https://scapy.readthedocs.io/ (verified `rdpcap`, `IP in pkt`, `pkt[IP].src/dst`, and that `__getattr__` on a Packet traverses payload layers via `getfield_and_val`, so `getattr(pkt.payload, 'sport', '-')` will resolve `sport` from the TCP/UDP layer when present and return the default for ICMP)
- Wireshark documentation: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html (verified Follow → TCP Stream menu path)
- RFC 2663 (NAT terminology - SNAT, DNAT, MASQUERADE)
- RFC 5382 / RFC 5508 (NAT behavioral requirements - background)

## Issues Found
No technical issues found.

## Review Notes
- The Python scapy snippet uses `getattr(pkt.payload, 'sport', '-')`. This works correctly because scapy's `__getattr__` recursively delegates to `payload.getfield_and_val()`, so the field is found in the TCP/UDP layer beneath IP. For ICMP packets, the default `'-'` is returned. A more explicit alternative would be to import `TCP`/`UDP` and check `if TCP in pkt`/`if UDP in pkt`, but the current code is functionally correct.
- The `tcp[tcpflags] & tcp-syn != 0` filter captures any packet with the SYN bit set, which includes SYN-ACK packets (server replies). The post describes this as "connection attempts," which is a reasonable colloquialism — strict SYN-only captures would use `tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn`. Not technically incorrect, just slightly broader than the description suggests.
- iptables LOG rules in the `nat` table only fire for the first packet of each connection (due to conntrack short-circuiting subsequent packets from the nat table). This is the correct behavior for verifying translation but means established-connection traffic won't appear in the log — worth noting for users who expect to see every packet.
- `grep "PRE-NAT\|POST-NAT"` uses BRE alternation (`\|`), which is a GNU grep extension. Works on Linux (where iptables runs), so this is appropriate for the post's audience.
- The post is Linux/iptables-focused; users on nftables systems (modern Debian/RHEL) would use `nft monitor trace` or `nft ... log` rules instead, but this is out of scope for the post's chosen stack.
