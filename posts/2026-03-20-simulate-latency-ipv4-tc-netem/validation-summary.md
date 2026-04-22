# Validation Summary: How to Simulate Network Latency on IPv4 with tc netem

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux traffic control (`tc`)
- Netem queue discipline
- HTB queue discipline
- `u32` traffic filters
- IPv4 packet matching
- `ping`
- `mtr`

## Sources Consulted
- `tc-netem(8)` iproute2 man page: https://manpages.debian.org/testing/iproute2/tc-netem.8.en.html
- `tc(8)` iproute2 man page: https://manpages.debian.org/unstable/iproute2/tc.8.en.html
- `tc-htb(8)` iproute2 man page: https://manpages.debian.org/buster/iproute2/tc-htb.8.en.html
- `tc-u32(8)` iproute2 man page: https://www.man7.org/linux/man-pages/man8/tc-u32.8.html
- `mtr(8)` man page: https://manpages.debian.org/stretch/mtr/mtr.8.en.html
- Installed CLI help from `tc` iproute2 6.1.0 and `mtr --help`
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The ping example claimed `RTT ≈ 200ms (100ms each way)` after applying `tc qdisc add dev eth0 root netem delay 100ms`. A root netem qdisc on `eth0` delays packets going out on that interface, so a local ping normally sees about one added 100 ms delay unless the return path is shaped too. Updated the expected result to say RTT increases by about 100 ms and that comparable return-path shaping is needed for about 200 ms RTT.
- The HTB selective-traffic example used `htb default 10` while also applying netem to class `1:10`, which would delay unclassified traffic as well as the filtered traffic. Changed the default to class `1:20`, added class `1:20`, and kept netem on class `1:10` so only traffic matched by the IPv4 destination filter is delayed.
- The `tc qdisc show` verification output was presented as a fixed expected line. The qdisc handle and refcount can vary by system/runtime, so the comment now labels it as an example output.
- The `mtr` description said it shows "per-hop latency." `mtr` reports round-trip response times for each hop, so the wording was tightened to "round-trip times per hop."

## Review Notes
- The root netem examples affect egress traffic on the selected interface, not ingress traffic. Inbound delay testing usually needs shaping on the other endpoint, an intermediate router, or an ingress/IFB setup.
- The unfiltered root qdisc examples are not IPv4-only; they affect all egress packets on that interface. The selective example is IPv4-specific because it uses `protocol ip` and `match ip dst`.
- I did not execute privileged `sudo tc` commands on live interfaces; command syntax was checked against the man pages and installed CLI help.
