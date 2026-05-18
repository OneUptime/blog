# Validation Summary: How to Tune TCP Buffer Sizes on Ubuntu for Better Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel sysctl networking parameters (net.ipv4.tcp_rmem, tcp_wmem, tcp_moderate_rcvbuf, tcp_congestion_control, tcp_window_scaling, tcp_max_syn_backlog, tcp_mem)
- Linux kernel socket buffer parameters (net.core.rmem_max, wmem_max, rmem_default, wmem_default, somaxconn, netdev_max_backlog)
- TCP congestion control (BBR, CUBIC)
- Linux traffic control (`tc` qdisc, fq)
- `ss` command (iproute2)
- `sysctl` and `/etc/sysctl.d/`
- iperf3 (network throughput testing)
- `/proc/net/sockstat`, `/proc/sys/net/ipv4/tcp_mem`
- Bandwidth-Delay Product (BDP) concepts

## Sources Consulted
- Linux kernel documentation: ip-sysctl.rst (https://docs.kernel.org/networking/ip-sysctl.html)
- Linux kernel source: net/ipv4/tcp_input.c (tcp_rcv_space_adjust)
- iproute2 documentation for `ss` command
- iperf3 official documentation (https://iperf.fr/iperf-doc.php)
- Red Hat performance tuning guide for TCP buffer settings
- RFC 7323 (TCP Extensions for High Performance — window scaling)
- BBR paper / Google publications on BBR congestion control

## Issues Found
1. **Broken `awk` command for parsing `ss -tnm` output** — The post contained:
   ```bash
   ss -tnm | awk 'NR>1 {print $1, "rcvbuf:", $6, "sndbuf:", $7}'
   ```
   This does not work as advertised. `ss -tnm` produces multi-line output where each socket has a connection line followed by an indented `skmem:(...)` continuation line. Fields `$6` and `$7` on either line do not correspond to receive/send buffer sizes. Removed the broken command and replaced the explanation with accurate guidance that points readers to the `rb` (receive buffer) and `tb` (transmit buffer) fields inside the `skmem` continuation line.
2. **Incorrect column names (`rcvq`/`sndq`)** — The text referred to `rcvq` and `sndq`, but the actual `ss` output uses `Recv-Q` and `Send-Q` as column headers. Updated to the correct names so readers can map the explanation to real output.

## Review Notes
- The BDP example math (10 Gbps × 50 ms = 62.5 MB ≈ 60 MB) is correct.
- The default sysctl values shown in the "Default output" section match typical Ubuntu kernel defaults.
- The claim that `rmem_max` acts as a ceiling on `tcp_rmem` max is the conventional tuning advice and is the safe practical recommendation. Strictly per kernel documentation, `tcp_rmem` max "does not override `net.core.rmem_max`" and the precise interaction depends on whether auto-tuning or `SO_RCVBUF` is in use, but keeping `rmem_max >= tcp_rmem[2]` is the universally recommended best practice and the post's advice is sound.
- The iperf3 example throughput numbers (602 Mbits/sec and 2.42 Gbits/sec) are labeled as example output and are illustrative; the math does not exactly match the byte totals but this is presented as a generic before/after rather than literal output.
- The post correctly notes that 10,000 × 16 MB ≈ 160 GB as a theoretical worst case; in practice each connection has both rmem and wmem, so this is a conservative single-direction estimate.
- The BBR/CUBIC framing ("buffer bloat that CUBIC can cause") is a slight oversimplification — bufferbloat is caused by oversized network buffers and loss-based algorithms tend to fill them, while BBR avoids doing so — but the conclusion (BBR pairs well with large buffers) is correct.
- Device name `eth0` in the `tc qdisc` example is illustrative; modern systems often use predictable names like `enp0s3`, but readers will understand to substitute their own interface.
