# Validation Summary: How to Capture IPv4 Packets with tcpdump on Linux - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter syntax
- Linux packet capture
- IPv4, TCP, UDP, ICMP, DNS, and HTTP traffic
- PCAP files and Wireshark analysis

## Sources Consulted
- tcpdump.org tcpdump(1) manual: https://www.tcpdump.org/manpages/tcpdump.1.txt
- tcpdump.org pcap-filter(7) manual: https://www.tcpdump.org/manpages/pcap-filter.7.txt
- Linux man-pages tcpdump(1), generated from the upstream tcpdump repository: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Linux man-pages pcap-filter(7), generated from the upstream libpcap repository: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Wireshark User's Guide, opening capture files: https://www.wireshark.org/docs/wsug_html_chunked/ChIOOpenSection.html
- Local tcpdump/libpcap manuals and filter compiler: tcpdump 4.99.4 with libpcap 1.10.4
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The install example used `apt` while the post title says Linux generally. Changed the comment to say Debian/Ubuntu, because `apt` is not the package manager for every Linux distribution.
- The default capture example said "default interface". tcpdump actually auto-selects the lowest-numbered configured up non-loopback interface when `-i` is omitted, so the comment now says tcpdump's automatically selected interface.
- The `-n` and `-nn` descriptions implied that `-n` only disables host lookups and `-nn` additionally disables port-name lookups. Current tcpdump documentation describes `-n` as disabling conversion of host addresses, port numbers, and related addresses to names, so both comments were updated.
- The `-vv` comment said "full header decode", which overstates the manual. Updated it to "Even more verbose output."
- The `-s 0` comment said "full packet". Current tcpdump documents snaplen `0` as using the default 262144-byte snap length, so the comment was corrected.
- The TCP SYN filter matched any packet with the SYN bit set, including SYN-ACK replies. Changed it to `tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn` so it matches initial SYN packets for new connection attempts.
- The DNS query example used `udp port 53`, which captures both UDP DNS queries and responses. Changed it to `udp dst port 53` to match DNS queries sent to a DNS server.

## Review Notes
All reviewed filter expressions compiled successfully with `tcpdump -d` using tcpdump 4.99.4 and libpcap 1.10.4. The HTTP GET filter is valid for plaintext HTTP over IPv4/TCP port 80, but it will not match encrypted HTTPS traffic or IPv6 packets because libpcap `tcp[...]` packet data accessors apply to IPv4 transport headers.
