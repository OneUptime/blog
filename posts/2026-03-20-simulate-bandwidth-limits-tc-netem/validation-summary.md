# Validation Summary: How to Simulate Bandwidth Limits on IPv4 with tc netem rate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm (`tc-netem`)
- Token Bucket Filter (`tc-tbf`)
- IFB-based ingress shaping
- iperf3

## Sources Consulted
- `tc-netem(8)` manual page: https://man7.org/linux/man-pages/man8/netem.8.html
- `tc(8)` manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-tbf(8)` manual page: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- iperf3 official documentation: https://software.es.net/iperf/invoking.html
- Local `tc` parser behavior from iproute2 6.1.0

## Issues Found
- The `packetoverhead 26` example was invalid for `tc-netem`; `rate` accepts packet overhead as a positional argument. Changed it to `rate 10mbit 26`.
- The post could imply that a root netem qdisc shapes a full bidirectional connection or only IPv4 traffic. Clarified that these examples shape outbound traffic from the interface, and that IFB or traffic classification is needed for inbound or IPv4-only shaping.
- The ADSL and iperf3 examples used wording that could imply downstream shaping while the shown root qdisc affects egress. Updated the wording to say outbound where appropriate.
- The comparison table said "Burst support" for netem rate. Updated it to "Configurable burst support" because netem rate can still show timer-related bursts, but it does not expose TBF-style burst configuration.

## Review Notes
The remaining `tc qdisc add`, `change`, `show`, and `del` examples match documented `tc`/netem syntax. The iperf3 server/client examples match the official `iperf3` command-line documentation.
