# Validation Summary: How to Combine tcpdump Filters with AND, OR, NOT Operators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcpdump
- libpcap / pcap-filter syntax
- Berkeley Packet Filter expressions
- Linux packet capture filtering
- TCP, UDP, ICMP, ports, hosts, and networks

## Sources Consulted
- tcpdump.org pcap-filter(7) manual: https://www.tcpdump.org/manpages/pcap-filter.7.txt
- tcpdump.org tcpdump(1) manual: https://www.tcpdump.org/manpages/tcpdump.1.txt
- Linux man-pages pcap-filter(7), generated from the upstream libpcap repository: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux man-pages tcpdump(8): https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Local tcpdump/libpcap manuals and filter compiler: tcpdump 4.99.4 with libpcap 1.10.4

## Issues Found
- The post stated that AND has higher precedence than OR in BPF. libpcap's pcap-filter documentation says `not` has the highest precedence, while `and` and `or` have equal precedence and associate left-to-right. Updated the grouping section to describe the expression as easy to misread and changed the precedence note accordingly.

## Review Notes
All filter examples in the post compiled successfully with `tcpdump -d -nn` using tcpdump 4.99.4 and libpcap 1.10.4. The `-c`, `-n`/`-nn`, `tcp[tcpflags]`, `tcp-syn`, `tcp-rst`, `host`, `net`, `port`, and `portrange` usage aligns with the consulted manuals. Running live captures still depends on local interface permissions and matching traffic being present.
