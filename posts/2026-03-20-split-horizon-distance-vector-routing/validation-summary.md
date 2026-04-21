# Validation Summary: How to Understand Split Horizon in Distance Vector Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Distance vector routing
- RIP / RIPv2
- EIGRP
- Split horizon
- Poison reverse
- FRRouting / FRR ripd
- IPv4 routing

## Sources Consulted
- RFC 2453, RIP Version 2: https://datatracker.ietf.org/doc/rfc2453/
- FRRouting RIP documentation: https://docs.frrouting.org/en/latest/ripd.html
- Cisco IOS EIGRP command reference for split-horizon behavior: https://www.cisco.com/c/en/us/td/docs/ios/iproute_eigrp/command/reference/ire_book/ire_s1.html
- Author GitHub profile link referenced by the post: https://github.com/nawazdhandala

## Issues Found
- The FRR verification example used `debug ip rip`, but current FRR documents RIP debug commands as `debug rip events`, `debug rip packet`, and `debug rip zebra`. Changed it to `vtysh -c "debug rip packet"` and adjusted the comment to describe packet debugging accurately.
- The "Split Horizon vs Route Poisoning" section compared split horizon specifically with poison reverse. Renamed the heading to "Split Horizon vs Poison Reverse" to avoid conflating generic route poisoning with the split-horizon poison-reverse variant.
- The `show ip rip status` comment said "Check RIP neighbors"; FRR documents this command as showing RIP status, including peer information. Changed the comment to "Check RIP status and peer information."

## Review Notes
The split horizon and poison reverse explanations match RFC 2453: simple split horizon omits routes learned from a neighbor in updates sent back to that neighbor, while poison reverse includes them with an infinite metric. For RIP, metric 16 is infinity/unreachable, and poisoned reverse is safer for two-router loops at the cost of larger routing updates. The NBMA caveat is consistent with Cisco guidance that split horizon is usually disabled only where that topology requires it.
