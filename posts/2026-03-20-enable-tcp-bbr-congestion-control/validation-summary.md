# Validation Summary: How to Enable TCP BBR Congestion Control on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel networking
- TCP congestion control
- BBR (`tcp_bbr`)
- Linux `sysctl`
- `iproute2` tools (`ss`, `tc`)
- Python `socket` API
- `iperf3`

## Sources Consulted
- Linux kernel `tcp_bbr.c` source (v4.9), including the BBR pacing/FQ note: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/ipv4/tcp_bbr.c?h=v4.9
- Linux kernel `tcp_bbr.c` source (current mainline tag checked during review): https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/ipv4/tcp_bbr.c?h=v6.15
- Linux kernel IP sysctl documentation for `tcp_available_congestion_control` and `tcp_congestion_control`: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel sysctl documentation for `net.core.default_qdisc`: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html#default-qdisc
- `iproute2` `ss(8)` manual for TCP info fields and filter syntax: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/ss.8
- `iproute2` `ss.c` source for the exact BBR output format (`bbr:(bw:...,mrtt:...,pacing_gain:...,cwnd_gain:...)`): https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/misc/ss.c
- `iproute2` `tc-fq(8)` manual for `fq` queueing discipline behavior and pacing: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/tc-fq.8
- Python `socket` documentation for `setsockopt()` and `TCP_CONGESTION`: https://docs.python.org/3/library/socket.html

## Issues Found
- The requirements section claimed “Linux kernel 5.13+ (BBR v2)”. I removed that version-specific statement because the mainline Linux documentation and source reviewed for this post expose BBR through `tcp_bbr` without documenting a separate “enable BBRv2 on 5.13+” path.
- The module-availability check implied that absence of `/lib/modules/.../tcp_bbr.ko*` means the kernel must be upgraded. I changed that note to account for kernels where BBR is built in (`CONFIG_TCP_CONG_BBR=y`) rather than shipped as a loadable module.
- The runtime `fq` step used only `net.core.default_qdisc=fq`, which changes the default qdisc for newly created interfaces but does not explicitly set `fq` on the live egress interface handling the traffic. I added `tc qdisc replace dev eth0 root fq` for the immediate runtime step and kept the sysctl for persistence/default behavior.
- The persistence example wrote directly to `/etc/sysctl.d/99-bbr.conf` with shell redirection that would fail for a non-root shell. I replaced it with `sudo tee` so the command works as written.
- The boot-time module-loading step was written as unconditional. I clarified that `/etc/modules-load.d/bbr.conf` is only needed when `tcp_bbr` is built as a module.
- The `ss` verification guidance was too specific and the monitor example documented the BBR info block with the wrong field separators and an incorrect explanation of `cwnd`. I corrected the note to match current `iproute2` output and updated the field descriptions to `bw`, `mrtt`, `pacing_gain`, and `cwnd_gain`.
- The benchmark section told readers to “note the throughput improvement,” which presumes BBR will always win. I changed that to a neutral comparison and replaced the overly specific thresholds with higher-level, technically safer conditions.
- The comparison table labeled CUBIC as “Poor” on cross-continental links. I softened that to “Good” with BBR “Often better,” which is more defensible and less absolute.
- The conclusion said enabling BBR is a “single sysctl change,” which is inaccurate because the post also depends on `fq` queueing and may depend on module loading. I corrected the summary sentence.

## Review Notes
- The Python per-socket example is technically valid on Linux: `socket.TCP_CONGESTION` is available in Python, and `setsockopt()` accepts a bytes-like object for the congestion-control name.
- The post still assumes a conventional Linux server environment with `iproute2`, `iperf3`, and permission to change qdiscs/sysctls.
- The runtime `tc qdisc replace dev eth0 root fq` example uses `eth0` as a placeholder interface name; readers still need to substitute the actual egress interface on their system.
