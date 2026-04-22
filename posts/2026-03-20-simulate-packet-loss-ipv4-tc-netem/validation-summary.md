# Validation Summary: How to Simulate Packet Loss on an IPv4 Interface Using tc netem

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm (`tc-netem`)
- iproute2 (`tc`, `nstat`)
- iputils `ping`
- `mtr`
- `tcpdump`
- TCP, UDP, ICMP, IPv4 packet-loss testing

## Sources Consulted
- Debian iproute2 `tc-netem(8)` man page: https://manpages.debian.org/bookworm/iproute2/tc-netem.8.en.html
- Local iproute2 `tc-netem(8)` man page and `tc -V` output (`iproute2-6.1.0`)
- Local `tc` parser checks for corrected `loss state` and `loss gemodel` commands
- Debian iputils `ping(8)` man page: https://manpages.debian.org/bookworm/iputils-ping/ping.8.en.html
- Debian `tcpdump(8)` man page: https://manpages.debian.org/bookworm/tcpdump/tcpdump.8.en.html
- Debian iproute2 `nstat(8)` man page: https://manpages.debian.org/bookworm/iproute2/nstat.8.en.html
- Debian `mtr(8)` man page: https://manpages.debian.org/bookworm/mtr-tiny/mtr.8.en.html
- Debian net-tools `netstat(8)` man page: https://manpages.debian.org/bookworm/net-tools/netstat.8.en.html
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The basic ping example said 5% outbound loss could appear as about 10% packet loss because replies may also experience the same loss. `tc-netem` applied as a root qdisc affects packets outgoing from the selected interface, so the expected ping loss from that local rule is roughly 5%. Updated the comment.
- The correlated random-loss example used `loss 10% 25%`. Current `tc-netem` documentation marks the correlated random-loss parameter as deprecated. Replaced it with the non-deprecated `loss state` Markov model example.
- The Gilbert-Elliott command used display labels (`p`, `r`, `1-h`, `1-k`) as input tokens. The accepted command syntax is positional values after `loss gemodel`. Updated the command and corrected the `1-h` / `1-k` explanation.
- The flood ping command omitted `sudo`, but `ping -f` with a zero interval requires superuser privileges. Added `sudo` and a short note.
- The `tcpdump` example captured only TCP SYN packets, which is not appropriate for later retransmission analysis. Changed it to capture TCP traffic to a pcap file.
- The retransmission counter example used `netstat -s` and `ss -s`. `netstat` is mostly obsolete, and `ss -s` does not report retransmission counters. Replaced both with `nstat -az TcpRetransSegs TcpExtTCPSynRetrans`.

## Review Notes
The `tc qdisc add` examples assume there is not already a root qdisc on the interface; on systems with an existing qdisc, users may need `tc qdisc replace` or `tc qdisc change` instead. NetEm operates at the interface qdisc level, so these examples affect outgoing packets on the interface, not only one application flow.
