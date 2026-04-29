# Validation Summary: How to Measure TCP Congestion Window Growth with ss

## Status
validated

## Post Type
How-to guide

## Technologies Covered
- Linux `ss` / iproute2
- TCP congestion control
- `iperf3`
- Bash
- `awk`
- Python 3

## Sources Consulted
- `ss(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- RFC 5681, TCP Congestion Control: https://datatracker.ietf.org/doc/html/rfc5681
- ESnet `iperf3` manual: https://software.es.net/iperf/invoking.html
- Linux `tcp_info` definitions in `include/uapi/linux/tcp.h`: https://codebrowser.dev/linux/linux/include/uapi/linux/tcp.h.html
- Local `ss --help` and `man ss` output from the review environment

## Issues Found
- The annotated `ss` example described `rtt:x/y` as RTT and variance, but `ss(8)` documents the second value as RTT mean deviation. I corrected that annotation.
- The annotated `ss` example described `rcv_space` as an allocated receive buffer, but `ss(8)` documents it as a helper variable for TCP receive-buffer autotuning. I corrected that annotation.
- The two `awk` examples used `match(..., ..., array)`, which failed under the default `awk` in the review environment. I rewrote both snippets using POSIX-compatible field parsing with `split`.
- The CWND capture script filtered only by destination host even though `iperf3` uses a control connection and a separate data connection. That could return multiple `ss` matches and write malformed CSV rows. I updated the sampler to use one-line `ss` output and emit a single selected record per interval.
- The transfer example omitted that `iperf3 -c` requires a listening `iperf3` server on the target host. I added that prerequisite as an inline comment.
- The conclusion implied that CWND, MSS, and RTT directly report achieved throughput and that comparing `cwnd` to `ssthresh` precisely identifies the transition between slow start and congestion avoidance. I corrected that wording to align with RFC 5681: CWND is a sender-side limit and supports an upper-bound estimate, while `ssthresh` helps infer the congestion-control phase.

## Review Notes
- `ss -i` output is kernel- and iproute2-version-dependent, so fields such as `bytes_sent`, `bytes_retrans`, `delivery_rate`, and `data_segs_out` may not appear on every Linux system.
- The shell examples are Linux-specific and rely on GNU-style behavior such as `date +%s.%3N` and fractional `sleep`.
