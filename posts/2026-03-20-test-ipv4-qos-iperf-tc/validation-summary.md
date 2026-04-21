# Validation Summary: How to Test IPv4 QoS Policies with iperf and tc

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- iperf3
- Linux tc
- TBF qdisc
- HTB qdisc and u32 filters
- netem
- CAKE
- fq_codel
- IPv4 QoS testing

## Sources Consulted
- ESnet iperf3 invocation manual: https://software.es.net/iperf/invoking.html
- ESnet iperf3 obtaining documentation: https://software.es.net/iperf/obtaining.html
- iproute2 tc(8) man page: https://manpages.debian.org/bookworm/iproute2/tc.8.en.html
- iproute2 tc-tbf(8) man page: https://manpages.debian.org/bookworm/iproute2/tc-tbf.8.en.html
- iproute2 tc-htb(8) man page: https://manpages.debian.org/bookworm/iproute2/tc-htb.8.en.html
- iproute2 tc-u32(8) man page: https://manpages.debian.org/bookworm/iproute2/tc-u32.8.en.html
- iproute2 tc-netem(8) man page: https://manpages.debian.org/bookworm/iproute2/tc-netem.8.en.html
- iproute2 tc-cake(8) man page: https://manpages.debian.org/bookworm/iproute2/tc-cake.8.en.html
- iproute2 tc-fq_codel(8) man page: https://manpages.debian.org/bookworm/iproute2/tc-fq_codel.8.en.html
- Local `tc` 6.1.0 help/man pages and parser checks.

## Issues Found
- The TBF example used `tc qdisc add` and a `burst 32kbit` value. `add` fails if a root qdisc already exists, and TBF burst is a byte-size bucket parameter; 32 kbit is only 4 KB. Changed the command to `tc qdisc replace` and `burst 32kb` so the example is repeatable and sized appropriately for a 10 Mbit/s shaper.
- The TBF stats comment implied `overlimits` directly meant delayed or dropped packets. Clarified that `overlimits` indicates shaping/delay activity and that drops are reported separately.
- The HTB and netem setup examples used `tc qdisc add`, which can fail when following tests sequentially because a root qdisc may already exist. Changed root qdisc setup commands to `replace`.
- The HTB u32 filter matched destination port 5201 without constraining the protocol. Added `match ip protocol 6 0xff` so the example specifically classifies the default TCP iperf3 flow.
- The competing iperf3 flow example used port 5202 but only showed the default server on port 5201. Added a second server instance on port 5202 for the background flow.
- The CAKE example deleted and re-added the root qdisc. Changed it to a single `tc qdisc replace` command for repeatable behavior.
- The results table treated any throughput below the limit as proof QoS was correct. Changed it to `Throughput ≈ limit`, which matches the intended bandwidth-limit validation.
- The filter troubleshooting command was too generic. Changed it to `tc -s filter show dev eth0 parent 1:0` so it targets the filter used in the HTB example.

## Review Notes
The post is technically valid after the fixes. The examples still assume Linux with iproute2 qdiscs available in the running kernel and an interface named `eth0`; users may need to substitute their actual egress interface name.
