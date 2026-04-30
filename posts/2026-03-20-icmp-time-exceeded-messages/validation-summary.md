# Validation Summary: How to Understand ICMP Time Exceeded Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- ICMP
- IPv4
- TTL
- traceroute
- ping
- tcpdump

## Sources Consulted
- RFC 792, "Internet Control Message Protocol": https://www.rfc-editor.org/rfc/rfc792.html
- RFC 1122, "Requirements for Internet Hosts - Communication Layers": https://www.ietf.org/rfc/rfc1122.txt.pdf
- RFC 1812, "Requirements for IP Version 4 Routers": https://www.rfc-editor.org/rfc/rfc1812.html
- `traceroute(8)` Linux manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `pcap-filter(7)` manual page: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Local CLI help and filter compilation: `ping -h`, `tcpdump --help`, `tcpdump -d`

## Issues Found
- The introduction described Type 11 only as a router TTL-expiry message and said it included only the original header. I corrected it to cover both Type 11 code paths and to note that RFC 792 includes the original IP header plus the first 64 bits of payload.
- The traceroute section implied every probe reply is ICMP Time Exceeded and used a capture filter that missed the normal final ICMP Port Unreachable response from classic UDP traceroute. I corrected the explanation and expanded the `tcpdump` filter to include that final reply.
- The routing-loop section treated repeated hop IPs as proof of a loop. I changed that to a qualified diagnostic clue and adjusted the command so it extracts IPv4 hop addresses more reliably.
- The fragment reassembly section stated a universal default timeout of 60 seconds. I corrected this to RFC 1122's recommendation of a fixed timeout between 60 and 120 seconds.
- The TTL section reversed the Linux/macOS flag note for `ping` and overstated what the received TTL proves. I corrected the Linux example to use `ping -c 1 -t 3` and clarified that hop estimation depends on knowing the sender's initial TTL.

## Review Notes
- The examples are IPv4-specific, which is consistent with the post tags and the `icmp[...]` capture filters shown.
- Repeated traceroute hops can also appear because of per-flow or per-packet load balancing, so they should be treated as evidence to investigate rather than conclusive proof of a loop.
