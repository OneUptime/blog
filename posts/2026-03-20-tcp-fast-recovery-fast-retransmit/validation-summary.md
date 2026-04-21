# Validation Summary: How to Understand TCP Fast Recovery and Fast Retransmit

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP fast retransmit
- TCP fast recovery
- TCP congestion control
- TCP selective acknowledgments (SACK)
- tcpdump
- Wireshark and TShark
- Linux nstat and TCP kernel counters
- Linux tc netem
- iperf3

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP) - https://datatracker.ietf.org/doc/html/rfc9293
- RFC 5681: TCP Congestion Control - https://www.rfc-editor.org/rfc/rfc5681.html
- RFC 2018: TCP Selective Acknowledgment Options - https://datatracker.ietf.org/doc/html/rfc2018
- RFC 6298: Computing TCP's Retransmission Timer - https://www.rfc-editor.org/rfc/rfc6298
- Wireshark Display Filter Reference: TCP - https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark TShark manual page - https://www.wireshark.org/docs/man-pages/tshark.html
- tcpdump manual page - https://man7.org/linux/man-pages/man8/tcpdump.8.html
- tc-netem manual page - https://man7.org/linux/man-pages/man8/tc-netem.8.html
- nstat manual page - https://manpages.debian.org/testing/iproute2/nstat.8.en.html
- Linux tcp(7) manual page - https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux kernel TCP retransmit counter source - https://github.com/torvalds/linux/blob/master/net/ipv4/tcp_output.c
- Linux kernel SNMP counter definitions - https://github.com/torvalds/linux/blob/master/include/uapi/linux/snmp.h
- ESnet iperf3 documentation - https://software.es.net/iperf/invoking.html

## Issues Found
- The duplicate ACK example used inconsistent ACK numbers and did not show enough later segments to produce three duplicate ACKs. Updated it to show TCP ACKs as the next expected segment and added a sixth segment so three duplicate ACKs for ACK=3 are possible.
- The fast recovery section described "Reno original" as lacking fast recovery. Changed this to "Tahoe-style behavior" because Reno is the TCP variant associated with fast recovery.
- The fast recovery math used `CWND / 2` for `ssthresh`. Updated it to `max(FlightSize / 2, 2 MSS)`, matching RFC 5681's congestion response.
- The fast recovery comment said the congestion window accounts for ACK segments. Changed it to account for segments that have left the network and are buffered at the receiver.
- The Linux `nstat` before/after example used `nstat -z`, whose default output is history-based. Updated it to `nstat -az` so the subtraction uses absolute counters.
- The SACK section overstated that SACK tells the sender exactly which segments arrived and that non-SACK TCP retransmits from the first lost segment onward. Clarified that SACK reports non-contiguous received ranges and lets the sender avoid retransmitting SACKed data.
- The monitoring and conclusion implied that a healthy network should mostly have fast retransmissions. Clarified that low retransmission volume is best, and that fast retransmission is preferable to timeout-based recovery when retransmissions occur.

## Review Notes
The commands are Linux-focused and assume appropriate privileges for packet capture and traffic control. `tshark` and `iperf3` were not installed locally in this environment, so their command-line details were checked against Wireshark and ESnet documentation rather than local help output.
