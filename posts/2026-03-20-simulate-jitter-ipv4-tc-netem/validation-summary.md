# Validation Summary: How to Simulate Jitter on IPv4 Connections Using tc netem Delay Variation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm queue discipline
- IPv4 network testing
- ICMP `ping`
- `mtr`
- `iperf3` UDP testing
- RTP/VoIP jitter concepts

## Sources Consulted
- Linux `sch_netem.c` source, `tabledist()` default uniform distribution behavior: https://raw.githubusercontent.com/torvalds/linux/master/net/sched/sch_netem.c
- iproute2 `tc-netem(8)` manual page for netem delay, jitter, correlation, distribution, loss, and reorder syntax: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- iproute2 `q_netem.c` parser source for accepted `tc qdisc ... netem` options: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/tags/v7.0.0/tc/q_netem.c
- iputils `ping(8)` manual page for `-c`, `-i`, and `mdev` interpretation: https://manpages.debian.org/unstable/iputils-ping/ping.8.en.html
- `mtr(8)` manual page for `--report`, `--report-cycles`, StDev, and jitter fields: https://manpages.debian.org/trixie/mtr-tiny/mtr.8.en.html
- ESnet iperf3 documentation for server/client mode, UDP mode, bitrate, duration, and IPv4/IPv6 options: https://software.es.net/iperf/invoking.html
- RFC 3550 for RTP interarrival jitter definition used in real-time media contexts: https://www.rfc-editor.org/rfc/rfc3550

## Issues Found
- The `ping` measurement comment described `mdev` as "mean deviation" and equated it directly with "jitter value." Current iputils documentation describes `mdev` as population standard deviation of RTTs. I changed the comment to say it shows RTT variability.
- The `iperf3` UDP output comment referred to "Packet Loss x%". UDP reports are shown as jitter plus lost/total datagrams with a percentage, so I changed the comment to match the reported column format.

## Review Notes
The `tc netem delay 100ms 25ms` example is technically correct for uniform delay variation when no delay distribution table is supplied; the Linux kernel `tabledist()` implementation uses a default uniform distribution in that case. The examples attach netem as a root qdisc on `eth0`, which affects outgoing traffic on that interface generally; an IPv4-only impairment would require traffic classification/filtering.
