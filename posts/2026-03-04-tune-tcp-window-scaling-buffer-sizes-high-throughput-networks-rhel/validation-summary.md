# Validation Summary: How to Tune TCP Window Scaling and Buffers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux TCP/IP networking
- TCP window scaling
- TCP socket buffer sysctl settings
- iperf3
- ss
- nf_conntrack

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Tuning TCP connections for high throughput - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/network_troubleshooting_and_performance_tuning/tuning-tcp-connections-for-high-throughput
- Linux kernel IP sysctl documentation - https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel /proc/sys/net documentation - https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux tcp(7) manual page - https://man7.org/linux/man-pages/man7/tcp.7.html
- iperf3 official documentation - https://software.es.net/iperf/
- Local command help for sysctl and ss

## Issues Found
- The BDP guidance said the TCP buffer should be at least as large as the BDP. Red Hat's current tuning guidance recommends sizing the maximum TCP buffer from the BDP and notes that roughly 2-3x BDP is often sufficient, so the wording was updated.
- The iperf3 verification comment described `-w` only as setting the window size. iperf3 uses this option for the socket buffer/window size, so the comment was corrected.
- The `ss` verification command grepped for the hostname in generic output, which can fail depending on address resolution and output formatting. It was changed to use an `ss` destination filter.
- The conntrack tuning comment applied broadly to busy servers. It was narrowed to busy servers that use connection tracking, because `nf_conntrack_max` is only relevant when conntrack is in use.

## Review Notes
The sysctl names and formats are valid. TCP window scaling, TCP SACK, and TCP timestamps are enabled by default on current RHEL releases, so setting them explicitly is mostly a verification/recovery step. The exact buffer values should still be tested per workload because large defaults and maximums can waste memory or add latency.
