# Validation Summary: How to Understand Routing Metrics and Cost

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Routing metrics and administrative distance
- Linux static routes and iproute2
- RIP/RIPv2
- OSPFv2 and FRRouting
- BGP path selection
- Cisco EIGRP
- Python

## Sources Consulted
- RFC 2328: OSPF Version 2: https://datatracker.ietf.org/doc/html/rfc2328
- RFC 2453: RIP Version 2: https://datatracker.ietf.org/doc/rfc2453/
- FRRouting OSPFv2 documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRRouting RIP documentation: https://docs.frrouting.org/en/latest/ripd.html
- FRRouting RIP CLI source for `offset-list`: https://github.com/FRRouting/frr/blob/master/ripd/rip_cli.c
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- NetworkManager route metric documentation: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-dbus.html
- Cisco BGP best path algorithm: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html
- Cisco IOS XR static route documentation: https://www.cisco.com/c/en/us/td/docs/routers/xr12000/software/xr12k_r4-1/routing/configuration/guide/routing_cg41xr12k_chapter8.html
- Cisco EIGRP wide metrics documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/configuration/15-s/ire-15-s-book/ire-wid-met.html
- Related OneUptime links in the post were opened and verified as reachable.

## Issues Found
- The static route table row conflated platform-specific route metrics with Cisco administrative distance. Updated it to note Cisco static routes default to administrative distance 1 and Linux route metrics are optional lower-preference values.
- The OSPF 1 Gbps example described the result as rounded to 1. Updated the wording to minimum cost 1, matching FRRouting's default cost behavior for links at or above the reference bandwidth.
- The FRRouting OSPF `auto-cost reference-bandwidth` example used an inline `!` comment. Moved the comment to its own line to keep the configuration syntax safe.
- The Linux multiple-route example called the higher-metric route failover. Changed the wording to backup route because route metrics do not by themselves perform gateway health checks.
- The BGP section omitted important simplified tie-break details and overstated MED comparison. Added the same-neighboring-AS caveat for MED and included the oldest eBGP path tie-break before router ID.
- The EIGRP table row omitted K values. Added K values to match Cisco's composite metric documentation.
- The RIP offset example used `ip rip metric-offset`, which is Cisco NX-OS-style syntax rather than FRRouting syntax. Replaced it with FRRouting `access-list` plus `router rip` `offset-list` syntax.
- The Python output block did not exactly match the spacing printed by the code. Updated the output block to match the executed result.

## Review Notes
The Python example was executed locally and matched the corrected output. The local environment has `iproute2` installed and `ip route help` confirms the route metric syntax, but `vtysh` is not installed, so FRRouting commands were verified against official FRRouting documentation and source rather than executed locally.
