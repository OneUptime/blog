# Validation Summary: How to Configure Mutual Redistribution Between OSPF and BGP

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OSPF (Open Shortest Path First) routing protocol
- BGP (Border Gateway Protocol)
- Cisco IOS configuration (route-maps, prefix-lists, redistribution)
- ASBR (Autonomous System Boundary Router) role
- Route tagging for loop prevention

## Sources Consulted
- Cisco IOS IP Routing: BGP Configuration Guide — `redistribute` and `address-family` syntax (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-mt/irg-15-mt-book.html)
- Cisco IOS IP Routing: OSPF Configuration Guide — `redistribute`, `subnets`, `default-information originate` (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-mt/iro-15-mt-book.html)
- Cisco IOS IP Routing: Protocol-Independent Configuration Guide — route-map and prefix-list (https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/configuration/15-mt/iri-15-mt-book.html)
- RFC 2328 (OSPF Version 2) — Type-5 AS External LSAs and E1/E2 metric semantics
- RFC 4271 (BGP-4) — redistribution semantics
- Cisco best-practice documentation on mutual redistribution and loop prevention with route tags

## Issues Found
No technical issues found.

The post correctly describes:
- The classic mutual-redistribution loop problem and the route-tag-based solution.
- Route-map syntax (`permit/deny SEQ`, `match tag`, `set tag`, `set metric`).
- OSPF redistribution requiring the `subnets` keyword for classless prefixes.
- BGP redistribution under `address-family ipv4 unicast` (valid in IOS; `unicast` is optional but accepted).
- `default-information originate always metric 10` for injecting a default route into OSPF.
- The administrative distance (110) and metric format `[110/metric]` for OSPF routes in the RIB.
- E2 external routes whose metric remains constant through the OSPF domain.
- Verification commands: `show ip ospf database external`, `show ip bgp`, `show ip route ospf`.

## Review Notes
- By default in Cisco IOS, `redistribute bgp` into OSPF only redistributes eBGP routes; iBGP routes require the `bgp redistribute-internal` command in BGP configuration. This is not relevant to the typical edge-router scenario described, but readers running iBGP at the edge should be aware.
- Similarly, `redistribute ospf 1` into BGP only redistributes OSPF intra-area and inter-area routes by default; redistributing external OSPF routes requires `match external 1 external 2` or `match internal external 1 external 2`. This is a reasonable default for the use case described but worth noting for completeness.
- The Mermaid diagram uses `\n` for newlines inside node labels. This works in current Mermaid renderers used by most static-site generators, so it is left unchanged.
