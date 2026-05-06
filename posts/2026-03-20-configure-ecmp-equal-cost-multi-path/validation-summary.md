# Validation Summary: How to Configure Equal-Cost Multi-Path (ECMP) Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel IPv4 multipath routing
- `iproute2` / `ip route`
- FRRouting (FRR)
- OSPF
- BGP

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.4/networking/ip-sysctl.html
- `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- FRRouting OSPF documentation: https://docs.frrouting.org/en/stable-9.1/ospfd.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/stable-10.4/bgp.html

## Issues Found
- The introduction implied ECMP itself provides automatic failover. I changed that wording to redundancy-focused language because Linux kernel documentation notes that failed nexthops can still be selected unless neighbor status or routing updates remove them from consideration.
- The `fib_multipath_hash_policy=1` explanation was too narrow and the value list was incomplete. I corrected the description to "Layer 4 (standard 5-tuple)" and added the documented `2` and `3` policy values from the kernel docs.
- The FRR BGP example had the `maximum-paths` comments reversed. I corrected `maximum-paths` to eBGP ECMP and `maximum-paths ibgp` to iBGP ECMP per FRRouting documentation.
- The verification example using `ss` did not actually show which ECMP nexthop Linux selected. I replaced it with `ip route get ... ipproto ... sport ... dport ...`, which is the documented way to test route lookup for a specific flow tuple.
- The section heading expanded FRR as "Free Range Routing". I corrected it to the current project name, FRRouting.

## Review Notes
- Static ECMP on Linux benefits from route health awareness. The kernel docs also expose `net.ipv4.fib_multipath_use_neigh`, which is relevant when you want nexthop selection to account for neighbor reachability.
