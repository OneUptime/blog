# Validation Summary: How to Understand TCP Window Size and Its Impact on Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP
- TCP receive window and bandwidth-delay product
- TCP window scaling
- Linux TCP sysctl settings
- ss
- tcpdump and pcap filters
- Python

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- RFC 7323: TCP Extensions for High Performance: https://datatracker.ietf.org/doc/html/rfc7323
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- ss(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/ss.8.html
- tcpdump(8) Linux manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- pcap-filter(7) Linux manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local CLI checks: `ss --help`, `tcpdump --version`, `tcpdump -d 'tcp[tcpflags] & tcp-syn != 0'`, `sysctl net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.ipv4.tcp_window_scaling net.ipv4.tcp_moderate_rcvbuf`

## Issues Found
- The introduction described the receive window as data buffered before "requiring acknowledgment." Updated it to describe the receive window as the data the receiver advertises it is willing to accept.
- The throughput formula was presented as an absolute maximum. Updated it to "window-limited throughput" because TCP throughput is also constrained by congestion control, sender/application behavior, loss, and other factors.
- The tcpdump section implied `win` could directly show multi-megabyte windows. Corrected it to state that `win` is the raw 16-bit TCP window field and must be multiplied by the negotiated window scale factor to get the effective receive window.
- The window scaling section referenced only RFC 1323. Updated it to note that RFC 7323 is the current specification, and clarified that SYN/SYN-ACK window fields themselves are not scaled.
- The Linux `tcp_rmem` example described the middle value as the default receive window. Corrected it to the default receive buffer and noted that values vary by kernel, distribution, and RAM size.
- The conclusion incorrectly said a 64KB window over a 100ms RTT path limits throughput to under 1 Mbps. Corrected it to about 5 Mbps.
- The conclusion stated that window scaling allows windows up to 1GB without qualification. Updated it to 1 GiB effective windows, subject to OS buffer limits.

## Review Notes
The Python example is syntactically valid and prints the stated 1 Gbps / 50ms result. The `tcpdump` filter expression compiled successfully with local tcpdump/libpcap, and the Linux TCP sysctl names are current.
