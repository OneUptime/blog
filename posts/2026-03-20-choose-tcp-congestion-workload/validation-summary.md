# Validation Summary: How to Choose the Right TCP Congestion Control for Your Workload

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP congestion control
- BBR
- CUBIC
- Linux networking sysctls
- Linux traffic control (`tc`, `fq`, `fq_codel`)
- `iproute2`
- `iperf3`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel `/proc/sys/net` documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- RFC 9438, CUBIC for Fast and Long-Distance Networks: https://www.rfc-editor.org/rfc/rfc9438.html
- IETF BBR congestion control draft: https://datatracker.ietf.org/doc/html/draft-cardwell-ccwg-bbr-00
- `tc-fq(8)` man page: https://man7.org/linux/man-pages/man8/tc-fq.8.html
- `tc-fq_codel(8)` man page: https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 6928, Increasing TCP's Initial Window: https://www.rfc-editor.org/rfc/rfc6928.html
- ESnet `iperf3` documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The post used hard decision thresholds and absolute recommendations for BBR that were broader than the cited standards support. I changed these to benchmark-oriented guidance and narrowed the claims.
- The post said BBR "ignores loss." That is inaccurate for the current BBR specification, which uses delivery rate, RTT, and packet loss measurements. I corrected the explanation.
- The post claimed CUBIC becomes "nearly unusable" on 500ms+ RTT paths. That overstated the case and conflicted with RFC 9438, which specifies CUBIC for fast, long-distance networks. I replaced it with a loss-sensitivity explanation that is technically accurate.
- The `fq` guidance implied `net.core.default_qdisc=fq` was the whole runtime change. I clarified that this sets the default for newly created qdiscs and added an immediate `tc qdisc replace` example for an existing interface.
- The web-serving example used `ip route ... via <gw> ...`, which is not shell-safe as written because angle brackets are redirection syntax. I replaced it with `GATEWAY_IP`.
- The web-serving section recommended `initcwnd 20` without qualification. I reduced this to a conservative `initcwnd 10` example aligned with RFC 6928 guidance.
- The comparison script could silently test the wrong algorithm if a congestion control module was unavailable, and it did not wait for the background `ping` to finish. I updated it to skip unavailable algorithms explicitly and wait for the latency sample to complete.

## Review Notes
- Linux 4.20 and newer no longer strictly require the `fq` qdisc for BBR because TCP-level pacing exists, but `fq` remains a common pairing for busy Linux hosts.
- `iperf3 -c ...` assumes an `iperf3` server is already running on the target host.
