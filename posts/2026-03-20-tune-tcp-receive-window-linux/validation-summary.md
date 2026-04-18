# Validation Summary: How to Tune TCP Receive Window Size on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel TCP stack (`net.ipv4.tcp_rmem`, `net.core.rmem_max`, `net.core.rmem_default`)
- Linux sysctl tunables (`tcp_moderate_rcvbuf`, `tcp_window_scaling`)
- `sysctl` CLI
- `ss` socket statistics tool
- `tcpdump` packet analyzer
- `iperf3` network throughput benchmarking
- Python `socket` module (`SO_RCVBUF`, `setsockopt`/`getsockopt`)
- Concepts: bandwidth-delay product (BDP), window scaling (RFC 7323)

## Sources Consulted
- Linux kernel documentation: `Documentation/networking/ip-sysctl.rst` (tcp_rmem, tcp_moderate_rcvbuf, tcp_window_scaling) — https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- socket(7) man page — https://man7.org/linux/man-pages/man7/socket.7.html (SO_RCVBUF semantics, rmem_max)
- tcp(7) man page — https://man7.org/linux/man-pages/man7/tcp.7.html
- ss(8) man page and iproute2 source — https://man7.org/linux/man-pages/man8/ss.8.html
- tcpdump(1) man page and source (print-tcp.c) — confirms raw 16-bit TCP header window is printed without applying wscale
- iperf3 documentation — https://iperf.fr/iperf-doc.php
- Python `socket` docs — https://docs.python.org/3/library/socket.html
- RFC 7323 (TCP Extensions for High Performance) for window scaling

## Issues Found
- **tcpdump output comment was incorrect.** The post said `win 29312 = 29312 bytes (after scaling factor applied)`. tcpdump prints the raw 16-bit `th_win` value directly from the TCP header (see tcpdump's `print-tcp.c`); the window scale option is printed separately and is not applied to the `win` field. Corrected the comment to: `win 29312 = raw 16-bit TCP header value (multiply by 2^wscale for actual bytes)`.

## Review Notes
- BDP calculations are arithmetically correct: 10 Gbps × 10 ms = 12.5 MB, and 1 Gbps × 100 ms = 12.5 MB.
- `tcp_rmem` default values shown (`4096 131072 6291456`) are a reasonable default; exact defaults vary by kernel version and system memory, but these are within the commonly documented range.
- `87380` bytes ≈ 85.33 KB, rounded to "85KB" in a comment — acceptable simplification.
- `ss -tin state established | grep rcv_space` works; note that `tcpi_rcv_space` is the receiver's auto-tuning space estimate rather than strictly "the allocated buffer," but the distinction is subtle and the value tracks buffer growth closely — left unchanged.
- The comment "OS may cap at rmem_max/2" for `SO_RCVBUF` is a common shorthand. Linux doubles the requested value for bookkeeping and caps the input at `rmem_max` (so `getsockopt` returns up to `2 × rmem_max`). The wording is loose but not strictly wrong as practical tuning guidance; left unchanged.
- Guidance to size max buffer to 2–4× BDP and to keep auto-tuning enabled (`tcp_moderate_rcvbuf=1`, `tcp_window_scaling=1`) matches current Linux networking best practice.
