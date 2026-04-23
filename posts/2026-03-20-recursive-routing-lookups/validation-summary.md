# Validation Summary: How to Understand Recursive Routing Lookups

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- FRRouting (FRR)
- OSPF
- Linux routing (`iproute2`)
- IPv4 routing and next-hop resolution

## Sources Consulted
- RFC 4271, BGP-4: https://www.rfc-editor.org/rfc/rfc4271
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRR OSPFv2 documentation: https://docs.frrouting.org/en/stable-10.2/ospfd.html
- FRR Next Hop Tracking developer documentation: https://docs.frrouting.org/projects/dev-guide/en/latest/next-hop-tracking.html
- `ip-route(8)` manual page: https://www.man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The FRR example used `show ip bgp 10.20.0.0/24`. FRR's latest docs say the old `show ip bgp` command structure may be removed in the future and should no longer be used, so I updated the example to `show bgp ipv4 unicast 10.20.0.0/24`.
- The sample FRR output strings for recursive resolution were too version-specific and not documented as stable output. I replaced them with a documented nexthop inspection command, `show bgp nexthop 192.0.2.1 detail`.
- The "Maximum Recursion Depth" section claimed FRR allows up to 10 recursive lookups by default. I did not find an official FRR or Linux reference supporting that user-facing default, so I rewrote the section to describe the documented behavior instead: recursive next-hops must resolve to a non-recursive route, and unresolved or mutually recursive next-hops remain invalid.
- The "BGP Next-Hop Resolution via Connected Route Only" section was incorrect. `bgp disable-ebgp-connected-route-check` and `neighbor ... disable-connected-check` control eBGP session establishment to non-directly connected peer addresses such as loopbacks; they do not disable recursive resolution for learned BGP routes. I replaced the incorrect commands and explanation with the documented connected-check behavior.
- The static-route section quoted a specific Linux error string for an invalid recursive gateway. Because the exact text is implementation-specific and not documented as a stable interface in `ip-route(8)`, I changed the explanation to the documented behavior: the kernel accepts the route only if the gateway is reachable via an existing route, unless `onlink` is used.
- The failed-lookup section quoted a specific `ip route get` failure string. I changed that to a generic description of lookup failure rather than an exact message, because the command behavior is the important documented point.

## Review Notes
- The core explanation of recursive next-hop resolution is technically sound and aligns with RFC 4271 route resolvability rules.
- FRR's documented nexthop inspection commands are a better fit for this topic than relying on version-dependent sample CLI output.
- `show ip ospf route` is valid in current FRR documentation and was left unchanged.
