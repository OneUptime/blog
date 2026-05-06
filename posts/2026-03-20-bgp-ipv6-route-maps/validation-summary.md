# Validation Summary: How to Configure BGP IPv6 Route Maps

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- FRRouting (FRR)
- Cisco IOS route maps
- BGP communities

## Sources Consulted
- FRRouting Route Maps documentation: https://docs.frrouting.org/en/latest/routemap.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Cisco IOS IPv6 Command Reference, `neighbor route-map`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.html
- Cisco IOS IPv6 Command Reference, `match ipv6 address`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco IOS IP Routing Protocol-Independent Command Reference, `set local-preference`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/Cisco_IOS_IP_Routing_Protocol-Independent_Command_Reference/IP_Routing_Protocol-Independent_Commands_S_through_T.html
- RFC 4271, BGP-4: https://datatracker.ietf.org/doc/rfc4271/
- RFC 1997, BGP Communities Attribute: https://datatracker.ietf.org/doc/html/rfc1997
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The post used invalid IPv6 example addresses such as `2001:db8:peer::/48` and `2001:db8:backup-peer::2`. I replaced them with valid documentation-prefix addresses from `2001:db8::/32` because IPv6 hextets must be hexadecimal.
- The FRRouting MED and AS-path prepending examples referenced `MY_NETS` without defining it. I added `ipv6 prefix-list MY_NETS` so the examples are self-contained and executable.
- The outbound FRRouting MED and prepending route maps had no catch-all `permit` clause, which would implicitly deny any nonmatching routes. I added `permit 99` entries so those examples modify selected routes without unintentionally filtering others.
- The FRRouting community-list example used `ip community-list standard`, while current FRR documentation uses `bgp community-list standard`. I updated the example to the current syntax.
- The FRRouting verification example told readers to look for `Local preference: 200`, but FRR route detail output shows `localpref 200`. I corrected the expected output string.
- The FRRouting AS-path prepending example omitted `vtysh` and `configure terminal`, so it was not directly runnable as shown. I added the missing CLI context and closing `end`.
- The route-map behavior explanation was slightly tightened so the default-deny behavior matches documented route-map semantics more precisely.

## Review Notes
- FRR syntax around community lists has changed across releases; this review aligned the post to current FRR public documentation.
- Cisco documents note some older IOS trains had limitations around `match ipv6 address prefix-list`; the syntax shown in the post matches current Cisco command references.
