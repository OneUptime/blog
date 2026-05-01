# Validation Summary: How to Detect TCP Congestion Collapse in Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP congestion control
- Linux networking tools (`ip`, `ss`, `nstat`, `tc`, `sysctl`, `ping`)
- Traffic control qdiscs (`fq`, `fq_codel`, `cake`)
- `iperf3`
- ECN and BBR

## Sources Consulted
- RFC 896, *Congestion Control in IP/TCP Internetworks*: https://www.ietf.org/ietf-ftp/rfc/rfc896.txt.pdf
- RFC 2309, *Recommendations on Queue Management and Congestion Avoidance in the Internet*: https://www.ietf.org/rfc/rfc2309.html
- Linux `nstat(8)` manual: https://www.man7.org/linux/man-pages/man8/nstat.8.html
- Linux `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `ping(8)` manual: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux kernel sysctl networking docs (`default_qdisc`): https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- Linux kernel IP sysctl docs (`tcp_congestion_control`, `tcp_ecn`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux `tc-fq(8)` manual: https://man7.org/linux/man-pages/man8/tc-fq.8.html
- Linux `tc-fq_codel(8)` manual: https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- Linux `tc-cake(8)` manual: https://man7.org/linux/man-pages/man8/tc-cake.8.html
- ESnet `iperf3` invocation docs: https://software.es.net/iperf/invoking.html

## Issues Found
- The `ip -s link show eth0 | grep 'TX bytes'` example did not match current `iproute2` output and did not actually show Mbps. I changed it to display the `TX:` statistics block and adjusted the explanation to compare counter growth against application goodput.
- The `ss` example looked for `snd_cwnd`, but current `ss -i` output exposes the field as `cwnd`. I corrected the command and updated the note to describe repeated sharp congestion-window reductions rather than claiming every collapse drops to `1`.
- The `nstat -z` before/after example treated `nstat` output as absolute counters even though `nstat` reports increments by default unless `-a` is used. I changed the test snippet to use `nstat -az` and compute deltas correctly.
- The monitoring loop mixed interval-based retransmission data with cumulative RX drop totals. I primed `nstat` history explicitly and changed the RX drop output to a per-interval delta so the script reports a meaningful live signal.
- The prevention section implied that `net.core.default_qdisc=fq` would switch the active qdisc on existing interfaces. Linux documents this as the default for newly created devices or multiqueue leaves, so I clarified that behavior and added an explicit `tc qdisc replace` command for the current interface.
- Several explanations used overly absolute thresholds or claims that were too broad, including "near zero" goodput, fixed RTT thresholds, a hard `50-90%` retransmission claim, and a blanket statement that BBR is more resistant than loss-based algorithms. I softened those statements to technically accurate guidance grounded in the RFCs and current Linux documentation.

## Review Notes
- Interface names such as `eth0` and `wan0` are placeholders and must be adapted to the actual host.
- The `iperf3` examples assume an `iperf3` server is already running on the target host.
- `sysctl -w net.ipv4.tcp_congestion_control=bbr` works only when BBR is available in the kernel configuration or as a loadable module.
- Current Linux kernel documentation lists the default `tcp_ecn` value as `2`; setting it to `1` is still valid, but it changes behavior by enabling ECN on outgoing connections as well as accepting ECN on incoming ones.
