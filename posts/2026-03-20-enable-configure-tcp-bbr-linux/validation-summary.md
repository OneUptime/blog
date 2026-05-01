# Validation Summary: How to Enable and Configure TCP BBR on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel TCP congestion control
- TCP BBR
- Linux `sysctl`
- `iproute2` (`ss`, `tc`, `fq`, `netem`)
- `iperf3`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel `/proc/sys/net/` documentation (`default_qdisc`): https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- IETF Internet-Draft, "BBR Congestion Control": https://datatracker.ietf.org/doc/html/draft-ietf-ccwg-bbr-05
- Google BBR quick-start documentation: https://github.com/google/bbr/blob/master/Documentation/bbr-quick-start.md
- `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- `tc-fq(8)` manual page: https://man7.org/linux/man-pages/man8/tc-fq.8.html
- `tc-netem(8)` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Local command help checked for syntax and option names: `sysctl --help`, `ss --help`, `tc qdisc help`, `tc qdisc add dev lo root fq help`, `tc qdisc add dev lo root netem help`, `modprobe --help`, `watch --help`

## Issues Found
- The introduction described BBR too absolutely as a bandwidth/min-RTT algorithm and overclaimed its effect. I updated the wording to keep the model-based explanation accurate without promising universal dramatic gains.
- The installation section implied `modprobe tcp_bbr` is always the first step. I changed it to first check whether BBR is already available, then load the module only if needed, and I corrected the kernel build guidance to allow both `CONFIG_TCP_CONG_BBR=y` and `CONFIG_TCP_CONG_BBR=m`.
- The post said BBR "requires" the `fq` qdisc. Current upstream guidance is more nuanced: modern Linux kernels no longer strictly require `fq` for BBR to function, though `fq` is still a strong default. I corrected the section heading and explanation accordingly.
- The qdisc section implied `default_qdisc=fq` simply applies to interfaces in general. I added the important kernel-doc nuance that physical multiqueue NICs keep `mq` at the root and use the default qdisc for their leaves.
- The verification section expected `ss` output like `cc:bbr` / `cc:` fields. Current `ss -i` output documents the congestion algorithm as `cong_alg`, and in practice the algorithm name appears at the start of the TCP info line. I updated the comments and the `watch` filter to match current output.
- The performance-testing section used `tc netem` without noting the TCP testing limitation. I added the caveat from `tc-netem(8)` that realistic TCP tests should place netem on the receiver ingress path.
- The conclusion claimed BBR is the recommended choice for most internet-facing services and promised `3-10x` throughput gains. Those claims were not supportable from the sources consulted, so I replaced them with qualified, source-consistent guidance.

## Review Notes
- The post still uses `/etc/sysctl.conf` for persistence. This is technically valid, though some distributions prefer drop-in files under `/etc/sysctl.d/`.
- BBR behavior varies by kernel version and distribution backports. The revised post now avoids version-sensitive claims that would be wrong on modern Linux.
