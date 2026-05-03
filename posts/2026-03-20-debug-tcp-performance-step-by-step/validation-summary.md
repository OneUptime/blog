# Validation Summary: How to Debug TCP Performance Issues Step by Step

## Status
validated

## Post Type
Tutorial / Methodology Guide

## Technologies Covered
- TCP (Transmission Control Protocol)
- Linux networking utilities: `ip`, `ethtool`, `ss`, `ping`, `traceroute`, `tracepath`, `nstat`
- `iperf3` for throughput measurement
- `strace` for syscall tracing
- `journalctl` / `dmesg` for kernel log inspection
- `awk` (gawk) for parsing
- Python 3 for BDP/throughput calculation
- OSI layer model (L1/2 Physical, L3 IP, L4 TCP, L7 Application)

## Sources Consulted
- iproute2 manual pages: `ss(8)`, `ip-link(8)` — https://man7.org/linux/man-pages/man8/ss.8.html
- ethtool manual: https://man7.org/linux/man-pages/man8/ethtool.8.html
- iputils: `ping(8)`, `tracepath(8)`, `traceroute(8)` — https://man7.org/linux/man-pages/man8/ping.8.html, https://man7.org/linux/man-pages/man8/tracepath.8.html
- strace manual: https://man7.org/linux/man-pages/man1/strace.1.html (specifically the `-T` flag for syscall timing in `<seconds.microseconds>` format)
- iperf3 documentation: https://iperf.fr/iperf-doc.php
- GAWK manual for 3-argument `match()` extension: https://www.gnu.org/software/gawk/manual/html_node/String-Functions.html
- RFC 5681 (TCP Congestion Control) and RFC 1191 (Path MTU Discovery) for the underlying mechanics referenced
- Linux kernel TCP_INFO source for `cwnd` units (segments/MSS) — confirmed `ss -i` reports cwnd in MSS units

## Issues Found
No technical issues found.

Verified specifics:
- The MTU probe payload of 1472 bytes is correct: standard Ethernet MTU 1500 − 20-byte IPv4 header − 8-byte ICMP echo header = 1472 bytes payload. With `-M do` (set DF bit), this confirms a clean 1500-byte path MTU.
- `ss -tin` flags are correct: `-t` (TCP), `-i` (internal/TCP_INFO including cwnd/rtt/mss), `-n` (numeric).
- The Python BDP calculation evaluates to 233.6 Mbps for the given inputs (cwnd=100 MSS, MSS=1460, RTT=5 ms), which is consistent with the `{theoretical:.1f}` format in the f-string.
- `strace -T` does emit per-syscall durations in `<float>` form, so the awk regex `/<[0-9]+\.[0-9]+>/` matches valid output.
- The 3-argument `match()` in awk is a gawk extension; gawk is the default `awk` on Debian/Ubuntu/RHEL/Fedora, so this works on virtually all production Linux distros.
- The diagnostic ladder ordering and the "start at Layer 1" guidance are consistent with standard network troubleshooting methodology.

## Review Notes
- The 3-argument `match()` in awk used in Steps 4 and 5 requires gawk (not mawk or BWK awk). It works on the vast majority of Linux distributions out of the box, but on minimalist images (e.g., Alpine with mawk, busybox awk) the snippet would need to be rewritten. Worth a brief mention in a future revision but not a correctness issue.
- The `ping -s 1472 -M do` test assumes IPv4 and a standard 1500-byte target MTU. On IPv6 or jumbo-frame paths (9000 MTU) the payload size would need adjustment.
- `ss -i` reports `cwnd` in units of MSS (segments), so the example variable name `cwnd_mss = 100` is appropriate.
- The post focuses on a Linux server perspective; intermediate-hop analysis (e.g., switch counters, BGP-level routing) is intentionally out of scope, which is a reasonable simplification for a methodology post.
