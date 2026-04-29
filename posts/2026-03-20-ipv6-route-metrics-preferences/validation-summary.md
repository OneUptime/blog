# Validation Summary: How to Understand IPv6 Route Metrics and Preferences

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Linux routing (`iproute2`)
- Router Advertisements (RA)
- RFC 4191 route preference
- FRRouting (FRR)
- OSPFv3
- BGP

## Sources Consulted
- `ip -6 route help` on the local system
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 4191, Default Router Preferences and More-Specific Routes: https://datatracker.ietf.org/doc/html/rfc4191
- FRRouting OSPFv3 documentation: https://docs.frrouting.org/en/latest/ospf6d.html
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 4271, BGP-4: https://datatracker.ietf.org/doc/rfc4271/

## Issues Found
- The post incorrectly treated Linux route `metric`, administrative distance, and IPv6 route preference as the same concept. I corrected the overview and summary to distinguish Linux kernel route metrics, RFC 4191 route preference, and routing-daemon administrative distance.
- The administrative-distance comparison table implied Linux has Cisco-style per-protocol administrative distance in the kernel FIB and used inaccurate protocol mappings such as `proto ospf` and `proto bgp`. I replaced that with an accurate explanation that Linux kernel routes do not expose a separate administrative distance field and that routing daemons such as FRR use administrative distance before installing routes into the kernel.
- The floating default-route example used invalid placeholder IPv6 link-local addresses (`fe80::isp1` / `fe80::isp2`). I replaced them with syntactically valid example addresses.
- The OSPFv3 example used the wrong FRRouting command (`show ipv6 ospf route`) and the BGP text overstated MED as if it were the sole BGP metric. I corrected the FRR command to `show ipv6 ospf6 route` and clarified that FRR shows MED in the BGP Metric column while BGP best-path selection also considers other attributes.
- The Router Advertisement sysctl examples were incorrect for changing route metrics. `accept_ra_rt_info_max_plen` controls acceptable route-information prefix lengths and `router_solicitations` controls RS behavior; neither sets route metric. I replaced them with `ra_defrtr_metric` and kept `accept_ra_rtr_pref` only for RFC 4191 preference handling.
- The ECMP section used two separate `ip -6 route add` commands for the same prefix/metric, which is not the normal `iproute2` multipath syntax. I replaced it with a single route using `nexthop` clauses, which matches `iproute2` route syntax for ECMP.

## Review Notes
- The Linux kernel uses longest-prefix match before route metric comparison, so “lowest metric wins” is only accurate once prefix length is equal.
- FRR administrative distance is internal to the routing daemon RIB; the Linux kernel route metric is a separate field.
- The FRR commands were validated against official FRR documentation, but not executed locally in this workspace.
