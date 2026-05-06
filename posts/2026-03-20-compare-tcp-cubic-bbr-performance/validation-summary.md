# Validation Summary: How to Compare TCP CUBIC and BBR Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP congestion control
- TCP CUBIC
- TCP BBR
- Linux `sysctl`
- Linux `tc` / NetEm
- `iperf3`
- `ping`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Linux kernel `/proc/sys/net/` documentation: https://docs.kernel.org/admin-guide/sysctl/net.html
- iperf3 official invocation and manual-page documentation: https://software.es.net/iperf/invoking.html
- RFC 9438, CUBIC for Fast and Long-Distance Networks: https://www.rfc-editor.org/rfc/rfc9438
- IETF BBR congestion-control draft: https://ietf-wg-ccwg.github.io/draft-ietf-ccwg-bbr/draft-ietf-ccwg-bbr.html
- Google BBR project quick-start documentation: https://github.com/google/bbr/blob/master/Documentation/bbr-quick-start.md
- Local Linux manual/help output consulted for command behavior: `man tc-netem`, `ping -h`, `sysctl --help`

## Issues Found
- Root-only commands were missing `sudo`. `apt install`, `modprobe tcp_bbr`, `sysctl -w`, and `tc qdisc` require elevated privileges in the documented workflow, so the commands were updated accordingly.
- The introduction and conclusion overstated BBR as a universal winner. I changed the wording to reflect the authoritative sources: CUBIC is primarily loss-based, BBR is model-based, and the winner depends on bandwidth-delay product, loss characteristics, queueing, and path conditions.
- The benchmark labels described the NetEm setup as generic RTT/loss tests even though `tc netem` on one interface affects only packets outgoing from that interface. I updated the script comments and labels to describe these as client-egress impairments and noted that symmetric emulation requires shaping the server path too.
- The `Typical Results` section presented exact numbers as generally representative. Those values are not portable across networks and contradicted the source-backed point that outcomes are path-dependent, so I replaced them with qualitative example outcomes.
- The latency-under-load example did not actually compare CUBIC and BBR separately. It reused one ping capture across both runs and never produced a distinct BBR latency result. I rewrote it to collect separate ping traces and averages for each algorithm.
- The qdisc recommendation was too broad for current Linux kernels. I changed the conclusion to note that modern kernels no longer strictly require `net.core.default_qdisc=fq` for BBR, while still acknowledging that `fq` can help pacing on heavily loaded senders.

## Review Notes
- The examples still assume client-to-server traffic by default. If the return path differs, repeating the benchmark with `iperf3 -R` is useful.
- The description mentions Wireshark analysis, but the post body does not currently include a Wireshark workflow.
