# Validation Summary: How to Filter BGP Routes Using AS-Path Access Lists

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BGP
- Cisco IOS / IOS XE
- AS-path access lists
- BGP AS-path regular expressions
- BGP route maps

## Sources Consulted
- RFC 4271, BGP-4: https://datatracker.ietf.org/doc/rfc4271/
- Cisco, Use Regular Expressions in BGP: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13754-26.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor filter-list` / `match as-path`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS IP Routing: BGP Command Reference, `show ip bgp regexp`, `show ip as-path-access-list`, `show ip bgp filter-list`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, Basic IP Routing (route-map behavior): https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_iri-iprouting.html
- Cisco IOS XE 17.11.x Configuring BGP (AS-path filtering procedure): https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-11/configuration_guide/rtng/b_1711_rtng_9600_cg/configuring_bgp.html

## Issues Found
- Clarified the Step 1 comment for `^[0-9]+$` to describe what it actually matches: a single-AS path, not a generic "directly connected AS" condition.
- Corrected the Step 3 neighbor comment so `^65100$` is described as accepting routes originated by AS 65100, not all routes merely received from that AS.
- Corrected the Step 4 route-map note: `route-map FILTER_UPSTREAM deny 20` with no match clauses is an explicit catch-all deny, not an implicit deny.
- Adjusted the Step 5 verification note for `show ip as-path-access-list` so it reflects the command’s purpose instead of implying it is primarily a hit counter command.
- Corrected the common-use-case wording around rejecting your own AS in the path. RFC 4271 already defines AS-loop detection for local-AS matches, so this is best described as an extra safeguard when exceptions such as `allowas-in` are in use.
- Corrected the transit-filtering bullet to describe route selection impact rather than saying it directly denies traffic.
- Changed the Step 4 code fence from `nginx` to `text` so the snippet metadata matches Cisco CLI syntax.

## Review Notes
- Cisco documentation notes that older IOS trains historically allowed 1-199 AS-path access lists, while later IOS/IOS XE releases increased the limit to 1-500. The post’s examples use low list numbers and remain valid.
- The examples use 2-byte AS numbers. Current IOS/IOS XE defaults use asplain for 4-byte AS regex matching, but operators using asdot notation need to account for escaped periods in regex patterns.
