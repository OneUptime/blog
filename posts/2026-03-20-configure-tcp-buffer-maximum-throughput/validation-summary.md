# Validation Summary: How to Configure TCP Buffer Sizes for Maximum Throughput

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Linux kernel networking (sysctl)
- TCP protocol (RFC 793, RFC 7323 window scaling)
- TCP buffer parameters: `net.ipv4.tcp_rmem`, `net.ipv4.tcp_wmem`, `net.core.rmem_max`, `net.core.wmem_max`, `net.core.rmem_default`, `net.core.wmem_default`, `net.ipv4.tcp_window_scaling`, `net.ipv4.tcp_moderate_rcvbuf`, `net.core.netdev_max_backlog`
- BBR congestion control (`net.ipv4.tcp_congestion_control`)
- iperf3 (network throughput measurement tool)
- ping (latency measurement)
- Python `socket` module (`SO_SNDBUF`, `SO_RCVBUF`)
- Bandwidth-Delay Product (BDP) concept

## Sources Consulted
- Linux kernel networking documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux `socket(7)` man page: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `tcp(7)` man page: https://man7.org/linux/man-pages/man7/tcp.7.html
- iperf3 documentation: https://software.es.net/iperf/invoking.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- RFC 7323 (TCP Extensions for High Performance — window scaling)
- BBR congestion control documentation (Linux kernel commit history, available since 4.9)

## Issues Found
No technical issues found.

Specific verifications:
- **BDP calculation**: 10 Gbps ÷ 8 = 1.25 GB/s × 0.005 s = 6,250,000 bytes ≈ 6 MB. Correct.
- **`tcp_rmem`/`tcp_wmem` format**: Three values (min, default, max) — correct.
- **Byte values**: 12,582,912 = 12 × 1024 × 1024 = 12 MB. Correct.
- **sysctl parameter names**: All match the kernel `ip-sysctl.txt` documentation.
- **iperf3 flags**: `-s`, `-c`, `-t`, `-P` are all valid and correctly used.
- **ping flags**: `-c` (count) and `-i` (interval) are valid.
- **Python socket API**: `SO_SNDBUF`/`SO_RCVBUF` with `SOL_SOCKET` is correct usage.
- **Linux doubling behavior**: The comment "OS caps at rmem_max / 2 for some kernels" correctly reflects that Linux doubles the `setsockopt` value (per `socket(7)` man page) and caps at `rmem_max`/`wmem_max`, so the effective requestable maximum is `rmem_max / 2`.
- **BBR availability**: Available since Linux kernel 4.9 (Dec 2016) — appropriate for any modern system.

## Review Notes
- `net.ipv4.tcp_window_scaling` and `net.ipv4.tcp_moderate_rcvbuf` are both enabled by default (= 1) on modern Linux kernels; setting them explicitly is harmless and good for documentation purposes.
- Strictly speaking, for auto-tuned TCP sockets, `tcp_rmem[2]` (the max) can exceed `rmem_max` because auto-tuning bypasses the `rmem_max` cap; `rmem_max` only caps explicit `setsockopt(SO_RCVBUF)` calls. The note "must be >= tcp_rmem/wmem max" is therefore a sensible best practice (so that explicit application-level sets aren't lower than auto-tuning would allow), even though it's not a strict kernel requirement. Not changed.
- The grouping of `tcp_window_scaling`, `tcp_moderate_rcvbuf`, and `netdev_max_backlog` under "Enable auto-tuning" is loose — `netdev_max_backlog` is a NIC backlog setting rather than auto-tuning per se — but the grouping isn't technically incorrect since these settings collectively support high-throughput auto-tuned operation.
- BBR is recommended as a bufferbloat mitigation; users should be aware BBR can be unfair to loss-based congestion control (CUBIC) on shared bottlenecks. Not noted in the post but out of scope for a buffer-tuning guide.
