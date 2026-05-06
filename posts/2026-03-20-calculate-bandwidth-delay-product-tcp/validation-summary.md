# Validation Summary: How to Calculate the Bandwidth Delay Product (BDP) for TCP Tuning

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Bandwidth-delay product (BDP)
- Linux TCP window scaling and autotuning
- Linux `sysctl`
- `ping`
- `ss`
- `iperf3`
- `bc`

## Sources Consulted
- RFC 7323: TCP Extensions for High Performance: https://www.rfc-editor.org/rfc/rfc7323.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel `/proc/sys/net/core/*` documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- Linux `tcp(7)` manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- ESnet iperf3 documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The post mixed decimal and binary size units in the worked examples and calculator output. I corrected the labels to `KiB`/`MiB` where the conversions were based on `1024` and `1048576`.
- The `10 Gbps LAN, 0.1 ms RTT` example table entry was incorrect by a factor of 10. I corrected it from `12.5 KB` to `122 KiB` to match the stated calculation.
- The original explanation for `2× BDP` incorrectly attributed one full extra BDP to ACKs in the reverse direction. I corrected this to Linux-specific guidance: BDP is the minimum effective window target, while a `2× BDP` buffer ceiling is a practical heuristic because Linux socket buffer limits include overhead and autotuning benefits from headroom.
- The verification section implied that `rcv_space` should be close to the max buffer and referenced undocumented `ss` field names. I changed it to documented `ss` output fields: `wscale`, `rcv_space`, and `skmem`.
- The `Satellite` scenario omitted link speed even though BDP depends on both bandwidth and RTT. I clarified it as `1G Satellite`.

## Review Notes
- The tuning commands and verification steps are Linux-specific. The TCP concepts are general, but `tcp_rmem`, `tcp_wmem`, `net.core.rmem_max`, `net.core.wmem_max`, and `ss` output semantics are specific to Linux.
- The example sets `tcp_rmem[1]` and `tcp_wmem[1]` to `1 MiB`, which raises global initial TCP buffer sizes. That is valid, but in some environments operators may prefer to leave the middle values closer to system defaults and only raise the max values.
- `sysctl -w` changes are runtime-only unless they are also persisted in system configuration.
