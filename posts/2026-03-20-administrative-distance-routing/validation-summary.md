# Validation Summary: How to Understand Administrative Distance in Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 routing
- Cisco IOS
- FRRouting
- Linux `iproute2`
- OSPF
- RIP
- BGP

## Sources Consulted
- Cisco, "Describe Administrative Distance": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/15986-admin-distance.html
- Cisco IOS command reference, `ip route`: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_route.htm
- FRRouting Zebra documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting STATIC documentation: https://docs.frrouting.org/en/stable-10.0/static.html
- FRRouting OSPFv2 documentation: https://docs.frrouting.org/en/stable-10.0/ospfd.html
- FRRouting RIP documentation: https://docs.frrouting.org/en/latest/ripd.html
- Linux `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html

## Issues Found
- The post described administrative distance as the trustworthiness of a routing protocol. I changed that to route source, because connected, static, kernel, and protocol-learned routes can all participate in route selection depending on platform behavior.
- The Cisco default-distance table labeled `255` as `Unknown/Unreachable`. I changed that to `Unknown` to match Cisco's terminology that a route with distance `255` is not believed and is not installed.
- The FRRouting defaults section said the defaults were "slightly different" even though the listed values matched the Cisco values shown in the post. I corrected that wording to avoid a false distinction.
- The OSPF-versus-RIP example called the RIP route a "floated static", which is incorrect because a floating static route is a manually configured static route with a higher administrative distance. I changed that line to describe the RIP route as a backup route instead.
- The AD-versus-metric explanation and key takeaways referred only to protocols. I changed those lines to "route sources" so the explanation matches how administrative distance is actually applied.
- The Linux/FRRouting example used `vtysh -c "show ip route 10.0.0.0"` and implied Linux shows OSPF metrics directly in a way equivalent to administrative distance. I changed it to `vtysh -c "show ip route 10.0.0.0/24"` and clarified that `ip route` does not show a separate AD field, while FRR's CLI does.
- The FRRouting distance example said RIP at `100` was more trusted than OSPF at `110` immediately after changing OSPF to `150` in the same snippet. I removed that misleading parenthetical so the example is no longer self-contradictory.

## Review Notes
- Administrative distance is vendor and routing-suite behavior rather than an IETF-standard protocol field, so Cisco and FRRouting documentation are the right references for these examples.
- The related reading links are plausible and the corresponding post directories exist in the repository.
