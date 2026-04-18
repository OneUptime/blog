# Validation Summary: How to Tune net.ipv4.tcp_rmem and net.ipv4.tcp_wmem for Optimal Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel TCP stack (sysctl)
- `net.ipv4.tcp_rmem` / `net.ipv4.tcp_wmem` parameters
- `net.core.rmem_max` / `net.core.wmem_max`
- `net.ipv4.tcp_moderate_rcvbuf`
- `sysctl` / `/etc/sysctl.d/`
- `ss` (iproute2) socket utility
- `/proc/net/sockstat`, `/proc/net/netstat`
- `iperf3` for benchmarking

## Sources Consulted
- Linux kernel networking documentation — ip-sysctl.txt: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- sysctl(8) man page (procps-ng)
- ss(8) man page (iproute2)
- Verified `/proc/net/tcp_stat` does not exist on standard Linux; confirmed `/proc/net/netstat` is the correct source for extended TCP statistics

## Issues Found
1. **Incorrect claim about `tcp_rmem` max overriding `net.core.rmem_max`.** The original table row stated "Maximum buffer per socket (overrides `net.core.rmem_max` if larger)". Per the kernel's `ip-sysctl.txt`, the tcp_rmem/tcp_wmem max value explicitly **does not** override `net.core.rmem_max`/`wmem_max`. The core `rmem_max`/`wmem_max` caps `setsockopt(SO_RCVBUF/SO_SNDBUF)` calls; tcp_rmem[2]/tcp_wmem[2] is the cap for auto-tuned buffers. Fixed the wording to clarify this distinction.

2. **Reference to non-existent `/proc/net/tcp_stat`.** The original post included `cat /proc/net/tcp_stat 2>/dev/null` to "check if TCP is in memory pressure". This file does not exist on standard Linux systems (only `/proc/net/tcp` and `/proc/net/tcp6` exist as per-connection tables, and `/proc/net/netstat` / `/proc/net/snmp` expose aggregate TCP counters). Replaced with `cat /proc/net/netstat | grep -i tcp`, which reliably returns extended TCP statistics (including `TCPPrunedSockets`, `TCPRcvCollapsed`, etc.) useful for diagnosing memory-pressure events.

## Review Notes
- The example default value `net.ipv4.tcp_rmem = 4096 87380 6291456` matches traditional Linux defaults documented in the kernel docs; actual defaults scale with RAM size on modern kernels but this is acceptable as an illustrative example.
- Memory-arithmetic examples in Step 3 (10,000 × 64 MB × 2 ≈ 1.28 TB; 10,000 × 128 KB × 2 ≈ 2.56 GB) are correct in decimal units.
- `sudo sysctl -p /etc/sysctl.d/99-tcp-*.conf` relies on shell glob expansion plus procps-ng sysctl's ability to accept multiple files with `-p`; this works on modern distributions but may fail on very old procps versions.
- `ss -men` flags are correct (`-m` memory, `-e` extended, `-n` numeric).
- Recommended values in the LAN/WAN/High-throughput scenarios are reasonable starting points — always validate against Bandwidth-Delay Product for the specific link.
