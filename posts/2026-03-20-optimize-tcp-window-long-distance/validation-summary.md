# Validation Summary: How to Optimize TCP Window Size for Long-Distance Links

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TCP (Transmission Control Protocol)
- Linux kernel `sysctl` networking parameters (`net.ipv4.tcp_rmem`, `net.ipv4.tcp_wmem`, `net.core.rmem_max`, `net.core.wmem_max`, `net.ipv4.tcp_window_scaling`, `net.ipv4.tcp_timestamps`, `net.ipv4.tcp_sack`, `net.ipv4.tcp_congestion_control`)
- TCP congestion control algorithms (BBR, CUBIC)
- TCP Window Scaling, Timestamps, SACK, PAWS (RFC 7323)
- iperf3 (throughput testing tool)
- Bandwidth-Delay Product (BDP) calculation

## Sources Consulted
- RFC 7323 — TCP Extensions for High Performance (Window Scale, Timestamps, PAWS): https://datatracker.ietf.org/doc/html/rfc7323
- RFC 2018 — TCP Selective Acknowledgment Options: https://datatracker.ietf.org/doc/html/rfc2018
- Linux kernel networking documentation (`ip-sysctl.txt`): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- iperf3 manual: https://software.es.net/iperf/invoking.html
- Google BBR congestion control documentation / RFC drafts: https://datatracker.ietf.org/doc/draft-cardwell-iccrg-bbr-congestion-control/

## Issues Found
1. **Arithmetic error in throughput estimate.** The post stated `131,072 / 0.150 = 874,480 bytes/sec`. The correct division is `131,072 / 0.150 ≈ 873,813 bytes/sec` (still ~7 Mbps when expressed in megabits/sec). Updated the comment to use the correct figure.
2. **Incorrect PAWS expansion.** The post described PAWS as "(anti-spoofing)". Per RFC 7323, PAWS stands for "Protection Against Wrapped Sequences" — it prevents acceptance of stale segments after sequence number wrap on high-bandwidth paths, not spoofing/security in the cryptographic sense. Updated the comment to use the correct expansion.

## Review Notes
- BDP computation is correct: 1 Gbps = 125,000,000 B/s × 0.150 s = 18,750,000 B (~18 MB / 17.88 MiB). The post's "18 MB" rounding is acceptable.
- Buffer sizes (`33554432` = 32 MiB) and the `tcp_rmem`/`tcp_wmem` 3-tuple format (min, default, max) match the kernel's documented semantics.
- Setting only `net.core.rmem_max`/`wmem_max` is correct for raising the ceiling that `tcp_rmem`/`tcp_wmem` autotuning can reach; values match.
- BBR characterization is fair: BBR (v1, the version in mainline Linux as `bbr`) does not rely on loss as a congestion signal and tends to outperform loss-based CC on long-fat networks. Note that BBR v2/v3 work continues; the post uses `bbr` which is the original implementation shipped in Linux ≥ 4.9, and that remains accurate as of the post date.
- iperf3 flags `-s`, `-c`, `-t`, `-w`, `-P` are all valid and behave as described.
- Persisting via `/etc/sysctl.conf` works on most distributions; on systemd-based systems with conflicting drop-ins under `/etc/sysctl.d/`, those may override. Not an error in the post — just a footnote for readers.
- The post does not mention enabling the BBR module (`modprobe tcp_bbr`) or adding it to `/etc/modules-load.d/`, which may be required on some kernels/distributions before `tcp_congestion_control=bbr` will succeed. This is a minor omission rather than an inaccuracy.
