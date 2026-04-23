# Validation Summary: How to Redistribute Routes Between Routing Protocols

## Status
validated

## Post Type
Guide

## Technologies Covered
- FRRouting (FRR)
- OSPFv2
- BGP
- Linux routing
- Route maps
- IP prefix lists

## Sources Consulted
- FRR OSPFv2 documentation: https://docs.frrouting.org/en/stable-10.0/ospfd.html
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- FRR filtering and prefix-list documentation: https://docs.frrouting.org/en/latest/filter.html
- FRR zebra routing-table commands: https://docs.frrouting.org/en/latest/zebra.html
- RFC 2328, OSPF Version 2: https://datatracker.ietf.org/doc/rfc2328
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The verification command `vtysh -c "show ip bgp" | grep "ospf"` was inaccurate. FRR does not label redistributed BGP routes with the literal string `ospf` in normal `show ip bgp` output, so I changed it to `vtysh -c "show ip bgp"` with a note that redistributed routes typically show origin `?`.
- The commands `ip route show proto ospf` and `ip route show proto bgp` were not reliable validation steps. In Linux, `ip route ... proto` depends on protocol identifiers defined in `rt_protos`, so those names are not portable FRR verification commands. I replaced them with FRR's own `show ip route ospf` and `show ip route bgp` commands.

## Review Notes
- The redistribution configuration syntax in the post matches current FRR documentation for OSPF and BGP.
- The warning about filtering redistributed routes is technically sound; FRR prefix-lists and route-maps are the right controls for limiting what is imported between protocols.
- The explicit `deny 0.0.0.0/0 le 32` lines in the prefix lists are redundant because FRR prefix-lists default to deny when defined, but they are still valid and do not need correction.
