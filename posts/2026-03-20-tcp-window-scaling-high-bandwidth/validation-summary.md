# Validation Summary: How to Enable TCP Window Scaling for High-Bandwidth Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TCP window scaling
- RFC 7323 TCP high-performance extensions
- Linux TCP sysctl tuning
- tcpdump and libpcap capture filters
- awk
- OpenSSH scp
- iperf3

## Sources Consulted
- RFC 7323, "TCP Extensions for High Performance": https://datatracker.ietf.org/doc/html/rfc7323
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Linux TCP output source showing receive-window scale selection: https://android.googlesource.com/kernel/common/+/android-mainline/net/ipv4/tcp_output.c
- Red Hat verified guidance on TCP initial window and window scale factors: https://access.redhat.com/solutions/29455
- tcpdump manual page: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- pcap-filter manual page for tcpdump capture expressions: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- procps sysctl.conf manual page: https://manpages.debian.org/trixie/procps/sysctl.conf.5.en.html
- Local command checks: `tcpdump --help`, `sysctl --help`, `man tcpdump`, `man pcap-filter`, `scp` usage output, and mawk syntax check.

## Issues Found
- The persistence example only saved `net.ipv4.tcp_window_scaling`, even though the section also changed TCP/core buffer limits. Updated it to create `/etc/sysctl.d/99-tcp-window-scaling.conf` with all sysctls shown in the tuning block.
- The Linux scale-factor example said a 16MB maximum maps to `wscale 8`. For the shown value `16777216` (16MiB), current Linux selection is `wscale 9`; updated the example and noted that `net.core.rmem_max` and socket/window limits also affect selection.
- The tcpdump transfer example treated the printed `win` value as an already scaled byte count. tcpdump prints the raw TCP header window field, so the example now captures the negotiated `wscale`, applies it explicitly, and uses line-buffered tcpdump output when piping to awk.
- The awk snippet used the non-portable `match(..., ..., array)` form. Rewrote it to work with the local default mawk implementation.
- The middlebox symptom estimated `64KB/10ms RTT` as about 5 Mbps. Corrected the math to about 52 Mbps.
- The middlebox diagnosis said no throughput difference proves scaling options are stripped. Reworded it so missing `wscale` in captures is the evidence, since equal throughput can also be caused by non-window bottlenecks.

## Review Notes
The examples were checked for command syntax and protocol correctness, but no live network test was run against `10.20.0.5`. The final post is technically valid as a Linux-focused guide; future improvements could mention that throughput can still be limited by congestion window, application behavior, CPU, packet loss, or sender-side buffering even when receive-window scaling is negotiated.
