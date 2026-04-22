# Validation Summary: How to Simulate Network Latency with tc netem

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm queue discipline (`netem`)
- PRIO queue discipline (`prio`)
- `u32` traffic control filters
- ICMP `ping`

## Sources Consulted
- `tc-netem(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- `tc(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-prio(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-prio.8.html
- `tc-u32(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/tc-u32.8.html
- Local `tc` help output from iproute2 6.1.0 (`tc -V`, `tc qdisc help`, `tc qdisc add ... netem help`, `tc filter add u32 help`)

## Issues Found
- The ping test said a 100ms netem delay should show about 100ms RTT. Because this qdisc delays outgoing packets on the selected interface, the RTT should increase by about 100ms over the baseline path latency. Updated the comment and sample output accordingly.
- The jitter/correlation example described the third delay argument as a distribution. In `tc-netem`, the third delay argument is correlation, while named distributions are configured with `distribution`. Updated the comment to say correlation.
- The selective traffic example said it created a `pfifo` qdisc, but the command creates a `prio` qdisc. Updated the comment.
- The selective traffic example used the default `prio` priority map, which can send some unfiltered packet priorities to class `1:3`. Added an explicit `priomap` that keeps unfiltered traffic on class `1:2`, leaving class `1:3` for the HTTP filter.
- The HTTP filter matched only destination port 80. Added an IPv4 protocol match for TCP (`match ip protocol 6 0xff`) so the rule more accurately targets HTTP traffic.
- The removal comment said deleting the qdisc removes all tc rules. `tc qdisc del dev eth0 root` removes the root qdisc, subclasses, leaf qdiscs, and attached filters under it, but not unrelated ingress/clsact state. Updated the comment to describe the scoped removal.

## Review Notes
The commands require root privileges or `CAP_NET_ADMIN` on a real system. The examples affect egress traffic on the selected interface; inbound delay requires a different setup such as applying netem on the peer/router side or using an ingress/IFB arrangement. The HTTP filter example is IPv4/plain HTTP only; HTTPS and IPv6 require separate matching rules.
