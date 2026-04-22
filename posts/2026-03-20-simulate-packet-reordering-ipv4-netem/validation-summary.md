# Validation Summary: How to Simulate Packet Reordering on IPv4 with tc netem

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm queue discipline (`tc-netem`)
- IPv4 packet reordering tests
- TCP retransmission and SACK behavior
- iperf3
- tcpdump / libpcap capture filters
- iproute2 tools (`ss`, `nstat`)
- net-tools `netstat`

## Sources Consulted
- iproute2 `tc-netem(8)` manual: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- iproute2 `tc(8)` manual: https://man7.org/linux/man-pages/man8/tc.8.html
- iproute2 `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- iproute2 `nstat(8)` manual: https://www.man7.org/linux/man-pages/man8/nstat.8.html
- net-tools `netstat(8)` manual: https://man7.org/linux/man-pages/man8/netstat.8.html
- tcpdump `tcpdump(8)` manual: https://man7.org/linux/man-pages/man8/tcpdump.8.html
- libpcap `pcap-filter(7)` manual: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- ESnet iperf3 manual: https://software.es.net/iperf/invoking.html
- Linux kernel IP sysctl documentation for TCP reordering/SACK context: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Local command help output for `tc ... netem help`, `ss -h`, `nstat -h`, `tcpdump -h`, and local man pages for `tc-netem`, `ss`, `nstat`, `netstat`, and `pcap-filter`.

## Issues Found
- The post described the second `reorder` percentage as correlation to the previous packet's delay. Changed it to correlation with the previous packet's reorder decision, because `reorder PERCENT [CORRELATION]` controls reordering correlation, not delay correlation.
- The TCP retransmission statistics section said to check the receiver and included `ss -s | grep -i retransmit`. Changed this to check the TCP sender and use `nstat -az TcpRetransSegs`, while keeping the `netstat -s` example. `ss -s` reports socket summary counts and does not expose retransmission counters.
- The tcpdump command attempted to count retransmissions with a stateless BPF filter using `tcp[4:4] = 0`, which matches a TCP sequence-number field value and does not identify retransmissions. Replaced the section with a tcpdump capture command suitable for later retransmission analysis.
- The `ss -tin` notes described `sacked` as the number of SACK blocks. Updated the wording to "selectively acknowledged segments" and clarified that `retrans` commonly appears as outstanding/total retransmissions.

## Review Notes
- The netem command syntax in the examples matches the documented `delay`, `reorder`, `gap`, and `loss` forms.
- A root netem qdisc affects outgoing traffic on the selected interface generally, not only IPv4 traffic. Add classification/filtering if a future version needs to target only IPv4 or only a specific flow.
- The `tc-netem(8)` manual notes that delay is required for reordering to be visible, and that realistic TCP performance testing may require placing netem on the ingress of the receiver because TCP Small Queues can affect sender-side tests.
- `netstat` is still valid where installed, but its own manual marks it mostly obsolete; `nstat`/iproute2 is the better default for Linux kernel TCP counters.
