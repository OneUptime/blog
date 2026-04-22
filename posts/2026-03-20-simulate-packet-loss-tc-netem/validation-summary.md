# Validation Summary: How to Simulate Packet Loss with tc netem

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm queue discipline (`tc-netem`)
- Packet loss, delay, jitter, corruption, and reordering simulation
- ICMP testing with `ping`

## Sources Consulted
- `tc-netem(8)` local man page from iproute2 6.1.0
- `tc qdisc add dev lo root netem help` local CLI help from iproute2 6.1.0
- `tc(8)` local man page from iproute2 6.1.0
- `tc-netem(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/netem.8.html
- `tc(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- Linux Foundation NetEm page: https://wiki.linuxfoundation.org/networking/netem

## Issues Found
- The state loss example described `loss state 5%` as a 4-state Markov model. The netem documentation says a single `P13` parameter corresponds to Bernoulli loss, with additional parameters extending the state model. Updated the comment to describe the actual behavior.
- The `gemodel 5% 10%` example was described as Gilbert-Elliott. The netem documentation defines the two-parameter form as the Simple Gilbert model, while four parameters are needed for the full Gilbert-Elliott form. Updated the comment.
- The delay/loss example included a `20ms` jitter argument but the comment only mentioned delay and loss. Updated the comment to include jitter.
- The reordering example said 25% of packets are delayed. The documented behavior for `delay 10ms reorder 25% 50%` is that 25% of packets are sent immediately while others are delayed, causing reordering. Updated the comment.
- The conclusion referred to `jitter` as if it were a standalone netem keyword. NetEm expresses jitter as the second argument to `delay`, so the wording now uses `delay <time> <jitter>`.

## Review Notes
The commands are syntactically valid for current `tc-netem`. Running `add`, `change`, and `del` qdisc commands requires root or `CAP_NET_ADMIN`, and the examples assume either no existing root qdisc or cleanup between standalone examples. NetEm applies these root qdisc impairments to egress traffic on the selected interface.
