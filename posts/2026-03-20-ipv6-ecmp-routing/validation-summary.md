# Validation Summary: How to Configure IPv6 Equal-Cost Multipath (ECMP) Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux kernel ECMP routing
- `iproute2`
- Linux sysctl
- FRRouting OSPFv3
- `systemd-networkd`
- `iperf3`

## Sources Consulted
- `ip-route(8)` local man page and `ip -6 route help`
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html
- FRRouting OSPFv3 documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- `systemd.network(5)` local man page
- Official `systemd.network` documentation: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8:remote::/48` and `2001:db8:remote::server`. I replaced them with valid documentation-prefix examples under `2001:db8:100::/48` so the commands and examples are syntactically correct.
- The post claimed that adding multiple IPv6 routes with the same metric via separate `ip -6 route add` commands is the way to configure ECMP. I removed that method and kept the documented multipath `nexthop ... nexthop ...` syntax from `ip-route(8)`.
- The ECMP hash-policy descriptions did not match current kernel documentation. I corrected the meanings of policy values `1` and `2`, and added the documented `3 = custom` mode.
- The `iperf3` example used an invalid IPv6 destination. I replaced it with a valid IPv6 test address.
- The failover section overstated behavior by saying Linux "automatically removes" failed paths. I narrowed the description to the verified interface-down case, where the affected nexthop is no longer used while the interface is down.
- The FRRouting OSPFv3 example output was inaccurate for an OSPF-learned ECMP route. I replaced it with a zebra-style ECMP route example that matches FRR documentation and uses valid IPv6 addresses.
- The persistent `systemd-networkd` example used duplicate `[Route]` sections instead of the documented multipath route configuration. I replaced it with `MultiPathRoute=` entries in a single `[Route]` section.
- The weighted ECMP example now uses `ip -6 route replace` so it correctly updates the route defined in the earlier example instead of failing with `File exists` if run sequentially.

## Review Notes
- Current kernel documentation shows `net.ipv6.fib_multipath_hash_policy` defaulting to Layer 3 hashing and also documents `fib_multipath_use_neigh`, which matters for detecting failed nexthops when the interface itself stays up.
- FRRouting currently documents `maximum-paths` for OSPFv3 with a default of `64`; that detail is implementation-specific rather than a protocol requirement.
