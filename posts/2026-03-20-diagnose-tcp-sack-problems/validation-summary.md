# Validation Summary: How to Diagnose TCP Selective Acknowledgment (SACK) Problems

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- TCP Selective Acknowledgment (SACK / DSACK)
- Linux TCP sysctls and SNMP counters
- `nstat` / iproute2
- `tcpdump`
- `tc netem`
- `bpftrace`
- Wireshark

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html
- RFC 2018, TCP Selective Acknowledgment Options: https://datatracker.ietf.org/doc/html/rfc2018
- RFC 2883, An Extension to the Selective Acknowledgement (SACK) Option for TCP: https://datatracker.ietf.org/doc/html/rfc2883
- RFC 6675, A Conservative Loss Recovery Algorithm Based on Selective Acknowledgment (SACK) for TCP: https://datatracker.ietf.org/doc/html/rfc6675
- Linux kernel source, `net/ipv4/tcp_input.c`: https://codebrowser.dev/linux/linux/net/ipv4/tcp_input.c.html
- Linux kernel source, `net/ipv4/tcp_timer.c`: https://codebrowser.dev/linux/linux/net/ipv4/tcp_timer.c.html
- Wireshark TCP analysis documentation: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- Wireshark TCP display filter reference: https://www.wireshark.org/docs/dfref/t/tcp.html
- `tcpdump(8)` manual: https://www.man7.org/linux/man-pages/man8/tcpdump.8.html
- `netem(8)` manual: https://www.man7.org/linux/man-pages/man8/netem.8.html
- local `nstat --help` output from the installed iproute2 tools
- local `tcpdump --help` output from the installed tcpdump build

## Issues Found
- The introduction overstated non-SACK behavior as retransmitting everything from the first lost packet forward. I corrected this to describe cumulative-ACK-based recovery more accurately.
- `net.ipv4.tcp_fack` was described as a deprecated optimization replaced in kernel 4.15+. Current kernel documentation says it is a legacy option with no effect, so I updated that wording.
- The handshake section treated SACK negotiation as simply requiring both SYN directions at once. RFC 2018 makes SACK-permitted direction-specific, so I corrected the SYN versus SYN-ACK explanation.
- The initial `nstat` example omitted zero-valued counters, which can hide the very counters the post tells readers to inspect. I changed it to `nstat -az`.
- Several Linux counter descriptions were inaccurate or too specific, especially `TcpExtTCPSackFailures`, `TcpExtTCPSACKDiscard`, `TcpExtTCPSackShifted`, and the DSACK counters. I rewrote them to match kernel docs and source behavior.
- The reneging section incorrectly implied cumulative ACKs move backwards and that any reneging necessarily points to a buggy middlebox. I corrected the symptoms and causes to match RFC 2018 and Linux documentation.
- The Wireshark reneging detection text claimed a specific expert-info label that is not documented in current Wireshark TCP analysis docs. I replaced it with a protocol-level inspection method.
- The `bpftrace` example used a stale or nonexistent kernel function name (`tcp_sacktag_walk_frag`). I replaced it with a version-aware probe discovery step and a current kernel function name (`tcp_sacktag_walk`) verified against Linux source.
- The tcpdump SACK block examples treated the right edge as inclusive. RFC 2018 defines SACK block right edges as exclusive, so I corrected the notation to half-open ranges.
- The throughput claim gave a fixed `40-60%` improvement and the conclusion used a hard `>0.1%` loss threshold without authoritative backing. I softened both claims to accurate, environment-dependent wording.

## Review Notes
- `tc netem` examples are syntactically correct, but the `netem(8)` man page notes that the most realistic TCP testing is typically done at the receiver ingress.
- The `bpftrace` probe example remains kernel-version-dependent even after correction; the added probe-discovery step is important before attaching a probe.
- The post is Linux-specific when discussing sysctls, counters, and kernel tracing. The RFC-level SACK behavior and Wireshark packet analysis are not Linux-specific.
