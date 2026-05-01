# Validation Summary: How to Detect and Fix TCP Retransmission Issues

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- TCP
- Linux networking tools (`netstat`, `nstat`, `ss`, `ip`, `ping`, `ethtool`, `sysctl`)
- `tcpdump`
- Wireshark
- `iperf3`

## Sources Consulted
- RFC 6298, "Computing TCP's Retransmission Timer": https://datatracker.ietf.org/doc/html/rfc6298
- RFC 5681, "TCP Congestion Control": https://datatracker.ietf.org/doc/html/rfc5681
- Linux kernel IP sysctl documentation (`tcp_rmem`, `tcp_wmem`, `tcp_congestion_control`, `tcp_available_congestion_control`): https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Wireshark Display Filter Reference for TCP analysis fields: https://www.wireshark.org/docs/dfref/t/tcp.html
- Wireshark User's Guide, TCP Analysis: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html
- iperf3 official documentation, invoking iperf3: https://software.es.net/iperf/invoking.html
- iproute2 upstream `ss(8)` man page: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/main/man/man8/ss.8
- iproute2 upstream `ss.c` source for `retrans` output fields: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/main/misc/ss.c
- iproute2 upstream `tcp.h` header bundled with iproute2: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/main/include/uapi/linux/tcp.h
- Local man/help output for `nstat(8)`, `ping(8)`, `ethtool(8)`, `tcpdump --help`, and live local output from `netstat -s` / `ss -tin`

## Issues Found
1. **Incorrect `netstat -s` example output**: The post showed `RetransSegs: 12345` as if `netstat -s` printed the SNMP symbol name. On Linux, `netstat -s` prints a human-readable line such as `segments retransmitted`. I updated the example comment to match actual Linux output.
2. **Incorrect interpretation of `ss` retransmission counters**: The post claimed `retrans:5/100` meant "5 retransmitted out of 100 sent (5% loss)." Upstream `ss` uses kernel `tcp_info` fields for retransmission counters, and that output is not a direct loss percentage. I replaced the explanation with an accurate description.
3. **`tcpdump` retransmission detector only caught SYN retries**: The original `awk` example looked only for repeated SYN sequence numbers, which misses normal data retransmissions and did not match the section heading. I replaced it with a sequence-range based example that checks for repeated `seq start:end` values per flow.
4. **Root-cause guidance was too absolute**: The post stated that `>0%` loss in `ping` definitively meant packet loss on the path, and that high retransmits in `iperf3` output meant congestion. I softened both statements to reflect that ICMP can be treated differently from TCP and that retransmissions under load can indicate congestion without proving it.
5. **Duplex-mismatch fix was too blunt**: The original `ethtool -s eth0 duplex full speed 1000` example implied a one-sided forced setting was a general fix. I changed this to checking link settings and re-enabling autonegotiation when both ends are meant to autonegotiate, which is safer and technically sound as generic guidance.
6. **BBR recommendation overstated what it fixes**: The post said "Switch to BBR congestion control (handles loss better)." BBR is not a general fix for packet loss and may not even be available on a given kernel. I changed the text to first check `tcp_available_congestion_control` and frame BBR as an optional algorithm change.
7. **Opening/closing wording overstated causes and thresholds**: "slow receivers" and "receiver-side delays" were too loose as primary causes of retransmission, and the conclusion's retransmission percentages were stated as hard rules. I changed the cause wording to delayed/lost ACKs and reframed the percentage guidance as a rule of thumb.

## Review Notes
- The post is Linux-specific in practice even though the title is generic. Commands such as `ss`, `nstat`, `ip`, `ethtool`, and the `sysctl` keys are Linux tools/interfaces.
- `netstat` is still valid, but modern Linux troubleshooting generally prefers `ss` and `nstat`.
- The MTU example uses `1400` as an illustration; the correct MTU is path-specific and should be chosen from actual PMTU/encapsulation constraints.
