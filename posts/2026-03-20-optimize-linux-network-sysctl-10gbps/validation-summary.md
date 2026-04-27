# Validation Summary: How to Optimize Linux Network Stack with sysctl for 10Gbps Networks

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Linux kernel network stack (sysctl)
- TCP tuning parameters (tcp_rmem, tcp_wmem, tcp_mem, BBR, SACK, window scaling)
- Socket buffers (rmem_max, wmem_max)
- ethtool offloads (TSO, GRO, LRO, checksum)
- ethtool ring buffers
- iperf3 throughput testing
- udev persistence rules
- fq qdisc

## Sources Consulted
- Linux kernel documentation: networking/ip-sysctl.rst (https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt)
- Linux kernel admin-guide: sysctl/net.rst
- ethtool(8) man page
- iperf3 documentation (https://iperf.fr/iperf-doc.php)
- BBR congestion control paper and Linux kernel commits (since 4.9)
- udev(7) man page for rule syntax
- RFC 1323 (TCP Window Scaling/Timestamps), RFC 2018 (SACK), RFC 5681 (TCP Congestion Control)

## Issues Found
No technical issues found.

Verification details:
- BDP calculation (10 Gbps × 10ms = 12.5 MB) is mathematically correct.
- Default-buffer throughput estimate (~200 KB → ~160 Mbps at 10 ms RTT) is correct: 200,000 × 8 / 0.010 = 160 Mbps.
- tcp_mem values are correctly noted as being in 4 KB pages: 262144 × 4 KB = 1 GB, 1048576 × 4 KB = 4 GB, 2097152 × 4 KB = 8 GB.
- All sysctl parameter names exist and are spelled correctly in the current Linux kernel (verified against kernel/Documentation/networking/ip-sysctl.rst).
- BBR + `fq` qdisc combination is the standard recommendation; this works on Linux 4.9+.
- ethtool feature names `tx-checksum-ipv4`, `tx-checksum-ipv6`, `tso`, `gro`, `lro` are valid feature short-names accepted by `ethtool -K`.
- iperf3 flags `-c`, `-s`, `-t`, `-P`, `-p`, `-R` are all valid and current.
- udev rule format (`ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", RUN+="..."`) is correct syntax.

## Review Notes
- LRO (Large Receive Offload) should be used with caution: it is generally not safe on hosts that forward packets (routers, bridges, virtualization hosts) because it merges segments and breaks end-to-end TCP semantics. The post mentions "if supported" but does not warn about the forwarding caveat. GRO (which the post also enables) is the safer modern equivalent.
- `net.ipv4.tcp_tw_reuse = 1` is correct; the related `net.ipv4.tcp_tw_recycle` was removed in Linux 4.12 — the post correctly avoids that deprecated knob.
- `net.ipv4.ip_local_port_range = 1024 65535` is more aggressive than typical defaults (32768–60999). It is technically valid but may collide with services that historically bind to fixed ports below 32768. This is a deliberate tuning choice, not an error.
- `net.ipv4.tcp_sack`, `tcp_window_scaling`, and `tcp_timestamps` already default to `1` in modern kernels; the post explicitly sets them as a defensive measure, which is fine.
- BBR no longer strictly requires `fq` (since later refinements / BBRv2 work with `fq_codel` and others), but pairing BBR with `fq` is still the most common, well-tested combination, so the recommendation is sound.
- Ring-buffer max of 4096 is typical for many 10G NICs (Intel ixgbe, Mellanox mlx5, etc.) but the actual maximum varies by driver — readers should run `ethtool -g` to confirm before applying.
