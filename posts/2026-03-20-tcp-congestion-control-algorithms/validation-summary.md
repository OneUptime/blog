# Validation Summary: How to Understand TCP Congestion Control Algorithms (Reno, CUBIC, BBR)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP congestion control
- TCP Reno
- TCP CUBIC
- TCP BBR
- Linux TCP sysctl settings
- iperf3 throughput testing

## Sources Consulted
- RFC 5681, TCP Congestion Control: https://datatracker.ietf.org/doc/rfc5681/
- RFC 9438, CUBIC for Fast and Long-Distance Networks: https://datatracker.ietf.org/doc/html/rfc9438
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- iperf3 official manual page: https://software.es.net/iperf/invoking.html
- IETF BBR congestion control draft, draft-ietf-ccwg-bbr-05: https://datatracker.ietf.org/doc/html/draft-ietf-ccwg-bbr-05
- Google Research publication, "BBR: Congestion-Based Congestion Control": https://research.google/pubs/bbr-congestion-based-congestion-control-2/

## Issues Found
- The Reno fast recovery description said `CWND = CWND / 2` on three duplicate ACKs. RFC 5681 describes setting `ssthresh` from roughly half the in-flight data and temporarily inflating `cwnd` during fast recovery, so I changed the wording to describe the half-window reduction more accurately.
- The CUBIC behavior block was marked as `javascript` even though it is explanatory text. I changed the code fence to `text`.
- The CUBIC congestion response said `CWND × 0.8` / 20% reduction. RFC 9438 specifies `beta_cubic` as 0.7, so I changed this to `CWND × 0.7` / 30% reduction.
- The CUBIC growth description said it was independent of RTT. RFC 9438 describes CUBIC's window increase as a function of elapsed time since the last congestion event, so I replaced the absolute RTT wording with that model.
- The BBR section said BBR does not react to packet loss as a primary signal and recommended it for "congested networks." The current BBR draft describes BBR as model-based and using delivery rate, RTT, and packet loss rate, so I clarified that packet loss is not the primary congestion signal and narrowed the recommendation to shallow-buffer or random-loss paths.
- The `sysctl -w` examples omitted privilege escalation. I added `sudo` and clarified that `net.ipv4.tcp_congestion_control` sets the default for new TCP connections.
- The recommendation table applied TCP congestion control guidance to real-time gaming / VoIP without noting that those workloads are commonly UDP-based, and it recommended CUBIC for legacy compatibility. I changed the row to "TCP-based interactive traffic" and changed legacy compatibility to Reno.
- The conclusion stated an unconditional 5-10x BBR throughput improvement on 100ms+ RTT paths. I changed this to a conditional "several times higher" claim for paths where loss or buffering limits loss-based algorithms.

## Review Notes
CUBIC is a common Linux default, but the Linux kernel documents the default congestion control as kernel-configuration dependent. BBR also depends on kernel configuration or loaded modules, so users should check `net.ipv4.tcp_available_congestion_control` before setting it. The `iperf3` commands are syntactically valid, but they require an iperf3 server listening at the target address.
