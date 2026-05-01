# Validation Summary: How to Diagnose Slow Network Performance Using TCP Window Size

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux `ss`
- `tcpdump`
- Wireshark
- Linux `sysctl`
- `ping`

## Sources Consulted
- RFC 7323: TCP Extensions for High Performance - https://datatracker.ietf.org/doc/rfc7323/
- RFC 9293: Transmission Control Protocol - https://www.rfc-editor.org/rfc/rfc9293
- RFC 5681: TCP Congestion Control - https://www.rfc-editor.org/rfc/rfc5681
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- Wireshark User's Guide, TCP Analysis - https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis
- Wireshark User's Guide, TCP Stream Graphs - https://www.wireshark.org/docs/wsug_html/
- Wireshark Display Filter Reference for TCP - https://www.wireshark.org/docs/dfref/t/tcp.html
- tcpdump(8) manual page - https://man7.org/linux/man-pages/man8/tcpdump.8.html
- Local CLI verification: `ss --help`, `tcpdump --help`, `ping -h`, `ss -tni 'dst :443'`, and `sysctl net.ipv4.tcp_window_scaling net.ipv4.tcp_rmem net.ipv4.tcp_wmem net.ipv4.tcp_mem net.core.rmem_max net.core.wmem_max`

## Issues Found
- The throughput formula and examples mixed byte-rate math with Mbps output. I corrected the formula to bytes/sec and updated the examples to show the corresponding byte and bit rates.
- The `ss -tni` example cited `send_queue:0`, which is not representative of `ss -i` output. I replaced it with window-related fields that `ss` actually reports, including `wscale`, `rcv_space`, `rcv_ssthresh`, and `snd_wnd`.
- The `tcpdump` `win` explanation was inaccurate. I corrected it to describe `win` as the raw advertised TCP window field and noted that the effective window is scaled by `2^shift_count` only after window scaling is negotiated; SYN and SYN-ACK windows are not scaled.
- The zero-window section incorrectly equated a zero window with a Zero Window Probe (ZWP). I fixed the distinction so the post now correctly describes zero-window advertisements versus sender-side probes.
- The diagnostics script claimed to show events from the "last 60s" even though it performs a 5-second live capture. I corrected the label to match the command's behavior.
- The post referenced RFC 1323 for window scaling. I updated it to RFC 7323, which is the current standards-track specification.
- The best-practices note about BBR/CUBIC described them as improving "window management", which conflated congestion control with receive-window sizing. I revised that wording to keep the distinction technically accurate.

## Review Notes
- The examples are Linux-specific; `ss`, these `sysctl` paths, and the tuning guidance do not apply unchanged to non-Linux systems.
- Packet capture commands require appropriate privileges or capabilities.
- `tcpdump` prints the raw TCP window field. To interpret scaled windows correctly, the capture must include the TCP handshake where window scaling is negotiated.
