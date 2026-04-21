# Validation Summary: How to Use the TCP Window Scale Option Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP
- TCP Window Scale option
- Linux TCP sysctl settings
- tcpdump and pcap filters
- Wireshark display filters
- iptables TCP option stripping
- Python

## Sources Consulted
- RFC 7323: TCP Extensions for High Performance: https://datatracker.ietf.org/doc/html/rfc7323
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel network core sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux tcp(7) manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux tcpdump(8) manual page: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Linux pcap-filter(7) manual page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- Linux kernel source, `net/ipv4/tcp_output.c` (`tcp_select_initial_window`): https://android.googlesource.com/kernel/common/+/android-mainline/net/ipv4/tcp_output.c
- Local CLI checks: `tcpdump --version`, `tcpdump -d 'tcp[tcpflags] & tcp-syn != 0'`, `sysctl net.ipv4.tcp_rmem net.ipv4.tcp_window_scaling net.ipv4.tcp_moderate_rcvbuf net.core.rmem_max`, `iptables -j TCPOPTSTRIP -h`, and the updated Python estimator

## Issues Found
- The post described the window scale value as a single negotiated scale factor. Updated it to explain that each endpoint advertises its receive-window scale in the SYN handshake and that the scale values are fixed per direction.
- The option-format examples called the shift count the scale factor, used approximate 64KB-based arithmetic, and did not mention that SYN and SYN-ACK window fields are not scaled. Updated the wording to identify the shift count as the scale exponent, used the exact 65,535-byte TCP window field, and added the non-SYN caveat.
- The Linux scale-factor formula was incorrect. Current Linux computes receive window scale from the maximum receive space it needs to represent, including `net.ipv4.tcp_rmem[2]` and `net.core.rmem_max`, subject to connection clamps, using `clamp(floor(log2(space)) - 15, 0, 14)`. Updated the formula, examples, and Python estimator; this also corrected the 16MiB example from scale 8 to scale 9.
- The Wireshark display filter used the obsolete `tcp.options.wscale` field. Updated it to `tcp.options.wscale.shift`, which is current in the Wireshark TCP display filter reference.
- The troubleshooting section said a SYN-ACK missing `wscale` meant the remote server did not support window scaling and that updating the remote OS was the only solution. Updated it to include misconfiguration or middlebox stripping as possible causes.
- The iptables troubleshooting command looked for generic "window" matches. Updated it to check for `TCPOPTSTRIP` or `wscale`, which matches the iptables extension that can strip TCP window-scale options.
- The live `tcpdump | grep` troubleshooting command could buffer output when piped. Added `-l` to tcpdump for line-buffered output.

## Review Notes
The updated Python estimator ran successfully locally and reported receive scale 10 for this host's current TCP receive buffer settings. The tcpdump SYN filter compiled successfully with tcpdump 4.99.4 and libpcap 1.10.4. Packet capture remains the authoritative verification because per-socket `SO_RCVBUF`, route metrics, and window clamps can alter the actual scale advertised on a connection.
