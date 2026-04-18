# Validation Summary: How to Tune TCP Buffer Sizes on Linux for High Throughput

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel TCP/IP stack
- sysctl / `/etc/sysctl.d/` configuration
- TCP socket buffer parameters (`net.core.rmem_max`, `net.core.wmem_max`, `net.ipv4.tcp_rmem`, `net.ipv4.tcp_wmem`, `net.ipv4.tcp_mem`, `net.ipv4.tcp_moderate_rcvbuf`)
- Bandwidth-Delay Product (BDP) tuning
- iperf3 throughput testing
- Python `socket` module (`SO_RCVBUF`, `SO_SNDBUF`)

## Sources Consulted
- Linux kernel networking documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- `tcp(7)` man page: https://man7.org/linux/man-pages/man7/tcp.7.html
- `socket(7)` man page: https://man7.org/linux/man-pages/man7/socket.7.html
- `sysctl(8)` man page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- iperf3 documentation: https://iperf.fr/iperf-doc.php
- Python `socket` module reference: https://docs.python.org/3/library/socket.html
- RFC 1323 / RFC 7323 (TCP Extensions for High Performance) for window scaling background

## Issues Found
No technical issues found.

Verifications performed:
- BDP math: 1 Gbps × 100 ms = 12.5 MB and 10 Gbps × 50 ms = 62.5 MB — both correct.
- Page-based `tcp_mem` conversions: 1/2/4 GB ÷ 4096 = 262144 / 524288 / 1048576 pages — correct.
- Byte values: 134217728 = 128 MB and 25165824 = 24 MB — correct.
- Default sysctl values (`rmem_max`/`wmem_max` = 212992; `tcp_rmem` = 4096 87380 6291456; `tcp_wmem` = 4096 16384 4194304) match the documented Linux defaults.
- `net.ipv4.tcp_moderate_rcvbuf` is the correct parameter name for TCP receive-buffer auto-tuning.
- `iperf3` flags `-s`, `-c`, `-p`, `-t`, `-P` are all correct per the iperf3 docs.
- Python `setsockopt` usage with `SOL_SOCKET` / `SO_RCVBUF` / `SO_SNDBUF` is correct, and the cap against `rmem_max`/`wmem_max` is accurate for unprivileged processes.

## Review Notes
- The kernel internally doubles the value passed to `SO_RCVBUF`/`SO_SNDBUF` (documented in `socket(7)`), so a 64 MB request is accounted as 128 MB against the configured maximum. The post's note about the `rmem_max`/`wmem_max` cap is correct, but readers tuning at the edge of the limit may want to be aware of this doubling.
- Privileged processes can use `SO_RCVBUFFORCE`/`SO_SNDBUFFORCE` (with `CAP_NET_ADMIN`) to bypass the `rmem_max`/`wmem_max` ceiling — out of scope for this post but worth knowing.
- The comment "Default socket buffer sizes (for non-TCP sockets)" next to `rmem_default`/`wmem_default` is a reasonable simplification: TCP overrides the core defaults using `tcp_rmem`/`tcp_wmem`, so in practice these primarily affect UDP and other non-TCP sockets. Setting 24 MB defaults will increase memory pressure on UDP-heavy workloads — readers should size this for their use case.
- Modern high-throughput tuning often pairs buffer changes with a congestion-control change (e.g. `net.ipv4.tcp_congestion_control=bbr`) and `net.core.default_qdisc=fq`. The post focuses narrowly on buffers, which is fine, but BBR/fq is the natural follow-up topic.
