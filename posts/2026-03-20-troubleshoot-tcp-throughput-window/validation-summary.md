# Validation Summary: How to Troubleshoot TCP Throughput Problems Using Window Analysis

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- TCP (Transmission Control Protocol)
- iperf3 (network throughput testing tool)
- tcpdump (packet capture tool)
- tshark (Wireshark CLI)
- ss (socket statistics tool)
- ping (ICMP utility)
- Linux TCP tunables (tcp_rmem)
- Congestion control algorithms (CUBIC, BBR)
- Python 3 (for BDP calculation)

## Sources Consulted
- iperf3 man page and documentation (https://iperf.fr/iperf-doc.php)
- tcpdump man page (https://www.tcpdump.org/manpages/tcpdump.1.html)
- tshark / Wireshark display filter reference (https://www.wireshark.org/docs/dfref/t/tcp.html)
- iproute2 `ss` man page (https://man7.org/linux/man-pages/man8/ss.8.html)
- Linux kernel networking docs: ip-sysctl.txt (tcp_rmem, tcp_wmem)
- RFC 7323 (TCP Extensions for High Performance — Window Scaling)
- RFC 5681 (TCP Congestion Control)
- RFC 8312 (CUBIC)
- Google BBR papers / Linux kernel BBR documentation
- Bash reference manual — Job Control

## Issues Found
1. **Incorrect bash job number in Step 4**: The snippet used `kill %2` to terminate the backgrounded `tcpdump`, but `tcpdump &` is the only background job and therefore gets job number `%1`. The `sleep 60` command runs in the foreground and is not assigned a job spec. Running `kill %2` would fail with "no such job" and leave tcpdump running. Changed `kill %2` → `kill %1`.

## Review Notes
- The BDP calculation (`(window / rtt) * 8 / 1e6`) is correct for converting bytes/second to Mbps.
- The iperf3 example output format (`[ 5] 0.00-30.00 sec  3.27 GBytes  939 Mbits/sec  23   sender`) matches actual iperf3 output: the throughput (3.27 GiB over 30s ≈ 937 Mbps) is consistent with the reported 939 Mbps within rounding.
- The `-w` flag in iperf3 sets the socket buffer size, which effectively sets the advertised window (Linux doubles the value for bookkeeping, but the user-visible size is as specified).
- `tcp.window_size_value` is the unscaled 16-bit field in the TCP header; `tcp.window_size` (also available) gives the scaled value after window-scale negotiation — the post's choice is fine for raw inspection.
- Pattern 4's characterization of CUBIC as producing a classic "sawtooth" is a slight simplification — CUBIC's window growth curve is cubic/convex rather than linear, so the recovery shape differs from Reno — but the high-level behaviour (grow until loss, then shrink) is accurate enough for a troubleshooting guide.
- The `ss` filter syntax `"( dst 10.20.0.5 dport = :5201 )"` is valid; ss treats space-separated predicates as implicit AND inside filter expressions.
