# Validation Summary: How to Understand the TCP Three-Way Handshake (SYN, SYN-ACK, ACK)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP connection establishment
- TCP flags, sequence numbers, acknowledgments, and connection states
- TCP options including MSS, SACK, timestamps, and window scaling
- tcpdump and libpcap capture filters
- Linux ss/iproute2 socket state inspection

## Sources Consulted
- RFC 9293, Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- RFC 6528, Defending against Sequence Number Attacks: https://datatracker.ietf.org/doc/html/rfc6528
- IANA TCP Parameters, TCP Header Flags registry: https://www.iana.org/assignments/tcp-parameters/tcp-parameters.xhtml#tcp-header-flags
- tcpdump(8) manual, including `-S` / `--absolute-tcp-sequence-numbers`: https://www.tcpdump.org/manpages/tcpdump.1.html
- pcap-filter(7) manual, including `tcp[tcpflags]` and TCP flag constants: https://www.tcpdump.org/manpages/pcap-filter.7.html
- ss(8) iproute2 manual for TCP state filter names: https://manpages.opensuse.org/Leap-16.0/iproute2/ss.8.en.html
- Local command verification with `tcpdump --version` 4.99.4, libpcap 1.10.4, and `ss` from iproute2 6.1.0.

## Issues Found
- The first tcpdump filter used `tcp-syn or tcp-ack` as bare filter expressions. That compiles, but it does not test the TCP flags field as intended. Changed it to `tcp[tcpflags] & (tcp-syn|tcp-ack) != 0`, matching the pcap-filter documented flag syntax.
- The server-side `ss` command used `state syn-received`, which is not a valid Linux `ss` state name. Changed it to `state syn-recv`, which is the documented iproute2 identifier.
- The diagram described the client as "connection half-open" after receiving the SYN-ACK. Clarified that the client receives the SYN-ACK and sends the final ACK, avoiding the misleading state description.
- The post described ISNs as random and the handshake as a security mechanism that prevents spoofing. Changed this to "unpredictable" ISNs and noted that they reduce off-path spoofing risk, which matches RFC 6528 more closely.
- The failure examples treated a post-handshake RST as a closed port. A closed or actively rejected port normally returns RST instead of SYN-ACK; a RST after the third ACK usually means an application, proxy, or endpoint accepted and then aborted. Updated the troubleshooting notes accordingly.
- The conclusion overclaimed that packet captures always identify the failed phase and responsible side. Changed this to "well-placed packet capture" and described missing SYN-ACK/final ACK cases as pointing to an endpoint or network path, depending on capture position.

## Review Notes
The examples are IPv4-oriented, which is consistent with the post tags and the use of `tcp[tcpflags]` filter offsets. The article still intentionally stays at introductory depth and does not cover simultaneous open, TCP Fast Open, SYN cookies, or capture-point limitations in detail.
