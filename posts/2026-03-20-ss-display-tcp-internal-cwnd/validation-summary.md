# Validation Summary: How to Display TCP Internal Information (CWND, RTT) with ss -i

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux iproute2 `ss`
- TCP socket diagnostics
- TCP congestion window, RTT, retransmission, pacing, and delivery-rate metrics
- Shell and `awk`

## Sources Consulted
- Linux `ss(8)` manual page for iproute2 options, filters, and examples: https://www.man7.org/linux/man-pages/man8/ss.8.html
- Debian iproute2 `ss(8)` manual page for `-i` TCP internal field definitions: https://manpages.debian.org/unstable/iproute2/ss.8.en.html
- Linux kernel `tcp_get_info()` source for exported TCP info fields such as RTT, delivery rate, bytes sent, and bytes retransmitted: https://linux.googlesource.com/linux/kernel/git/torvalds/linux/+/88730166f3ee261c43e5087ea665f3a47966865b/net/ipv4/tcp.c
- RFC 5681, TCP Congestion Control, for congestion window and slow-start behavior: https://datatracker.ietf.org/doc/html/rfc5681
- Local verification with `ss --help`, `ss -V` (`iproute2-6.1.0`), `man ss`, and `mawk 1.3.4`.

## Issues Found
- The description said `ss -i` displays a retransmission rate and sender/receiver buffer information. Updated it to retransmission counters and receive-side autotuning information because `ss -i` exposes TCP info fields; full socket memory buffers are shown by `ss -m`.
- The `rtt:X/Y` row described the second value as variance. Updated the wording to variation while preserving the explanation that the second value is mean deviation.
- The post treated `bytes_retrans` and `delivery_rate << send` as direct proof of packet loss or congestion. Updated the wording to say data was retransmitted and that low delivery rate needs context such as loss, congestion, receiver limits, or app-limited traffic.
- The introduction and closing sentence overclaimed that `ss -i` enables precise packet-loss diagnosis and provides the richest TCP data available on Linux. Tightened them to describe `ss -i` as a rich TCP diagnostic source and a primary troubleshooting tool.
- The `awk` examples used the GNU awk-only third argument to `match()`, which fails on common default Linux `awk` implementations such as `mawk`. Rewrote both snippets using portable `split()`-based parsing and verified them locally.
- The congestion-window throughput example calculated `cwnd=10`, `MSS=1460`, `RTT=10ms` as about 116 Kbps. Corrected it to about 11.7 Mbps and updated the formula to include the `* 8` conversion for bits per second.
- The first command comment said `ss -ti` shows all established connections. Tightened it to TCP connections, while leaving the explicit `state established` command for established-only output.

## Review Notes
`ss -i` output varies by kernel and iproute2 version, and some fields only appear when relevant. The `send`, `pacing_rate`, and `delivery_rate` values should be interpreted as kernel estimates, not direct application throughput measurements.
