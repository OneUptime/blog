# Validation Summary: How to Calculate TCP Throughput from Window Size and RTT

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Linux networking tools (`ss`, `ping`, `tcpdump`)
- `iperf3`
- Linux TCP socket buffer tuning via `sysctl`
- Python

## Sources Consulted
- RFC 7323: TCP Extensions for High Performance: https://www.rfc-editor.org/rfc/rfc7323.html
- RFC 5681: TCP Congestion Control: https://www.rfc-editor.org/rfc/rfc5681
- The Linux Kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- ESnet iperf3 invocation documentation: https://software.es.net/iperf/invoking.html
- Local Linux manual/help output on the review host: `ss(8)`, `tcp(7)`, `tcpdump(8)`, `ss --help`, and `ping -h`

## Issues Found
- The post described `window / RTT` as a precise TCP throughput formula and treated the receive window alone as the relevant limit. I corrected this to a theoretical upper bound based on the current limiting TCP window, because throughput is governed by the smaller of the advertised receive window and congestion window.
- The `ss` guidance incorrectly suggested `rcv_space` was the window to use. I changed the post to use `snd_wnd` for receive-window analysis, because `rcv_space` is a Linux receive-buffer autotuning helper rather than the peer-advertised receive window.
- The `tcpdump` pipeline attempted to extract the effective window with `awk '{print $NF}'`, which would not reliably return the window value and ignored TCP window scaling. I replaced it with guidance to inspect `win` and the negotiated `wscale` value from the handshake.
- The Python example output did not match the function's real output and the 1 Gbps window example was numerically off. I updated the sample input and output so the printed RTT, throughput, and required window values are consistent with the code.
- The comparison and conclusion language was too absolute about root causes and tuning outcomes. I narrowed it so buffer tuning is recommended when the advertised receive window is the bottleneck, while lower-than-calculated throughput is attributed more accurately to congestion, loss, or endpoint/application limits.

## Review Notes
- `ping` provides a useful RTT estimate, but `ss -i` exposes TCP RTT for an active flow and can be more representative for connection-specific analysis.
- The Linux `tcp_rmem` and `tcp_wmem` settings control TCP buffer autotuning ranges and defaults; application-level socket buffer settings can still affect the final effective window.
