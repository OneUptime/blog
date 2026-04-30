# Validation Summary: How to Understand IPv6 Longest Prefix Match Routing

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- Linux routing
- `iproute2` / `ip -6 route`
- Longest Prefix Match (LPM)
- ECMP (Equal-Cost Multipath)
- Blackhole routes

## Sources Consulted
- RFC 7608, "IPv6 Prefix Length Recommendation for Forwarding": https://www.rfc-editor.org/rfc/rfc7608.html
- RFC 4632, "Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan": https://www.rfc-editor.org/rfc/rfc4632.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel networking sysctl documentation (`fib_multipath_hash_policy` / multipath routing behavior): https://docs.kernel.org/networking/ip-sysctl.html
- Local CLI help checked in the workspace environment: `ip -6 route help`

## Issues Found
- The Linux example block used a default-route lookup (`2001:db9::1`) without first adding a default IPv6 route. I added `::/0 via fe80::1 dev eth0` so the example is self-contained.
- The tie-break section described Linux route metric as "administrative distance", which is not correct terminology here. I corrected the explanation to state that, on Linux, the lower metric is preferred when prefix length ties occur in the same table.
- The tie-break and ECMP sections reused prefixes from the earlier example block, which would make the examples interfere with each other if run in sequence. I moved those sections to separate documentation prefixes.
- The ECMP section implied that adding the same route twice with the same metric is the Linux ECMP configuration pattern. I replaced it with the documented multipath route syntax using multiple `nexthop` entries in one route.
- The blackhole example used `ip -6 route get` with an exact output line that depends on how the kernel formats the resolved destination entry. I changed it to `ip -6 route get fibmatch` so the matched FIB entry is what gets displayed.

## Review Notes
- The core explanation of longest prefix match was technically correct and aligned with RFC 7608 / RFC 4632.
- The post correctly uses `2001:db8::/32`, which is the documentation prefix reserved for examples.
- Policy routing and multiple routing tables can override simple single-table route selection, but the post is scoped to basic FIB longest-prefix behavior on Linux.
- Command syntax and route-selection behavior were validated against the Linux `ip` documentation and local CLI help; the example routes were not installed on the host running this review.
