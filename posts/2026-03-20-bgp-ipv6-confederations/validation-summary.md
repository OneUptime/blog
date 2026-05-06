# Validation Summary: How to Configure BGP IPv6 with Confederations

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP
- IPv6
- BGP confederations
- FRRouting
- Cisco BGP configuration

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- RFC 5065, Autonomous System Confederations for BGP: https://datatracker.ietf.org/doc/html/rfc5065
- Cisco IOS IP Routing: BGP Command Reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IPv6 Routing: Multiprotocol BGP Extensions for IPv6: https://www.cisco.com/en/US/docs/ios-xml/ios/iproute_bgp/configuration/15_0sy/ip6-mbgp-ext.html

## Issues Found
- The FRRouting and Cisco examples used invalid IPv6 literals such as `2001:db8::r2`, `2001:db8::external`, and `2001:db8:myorg::/48`. These were replaced with syntactically valid documentation-prefix IPv6 examples.
- The FRRouting examples omitted `no bgp default ipv4-unicast`, even though FRR enables only IPv4 unicast by default unless address families are activated explicitly. This was added so the examples match an IPv6-only tutorial.
- The confederation peer lists included `65030`, which was not part of the topology shown in the post. The examples were corrected to list only the member-ASes actually described.
- The verification section claimed `show bgp ipv6 unicast summary` should display a confederation ID. The post was updated to use documented FRR output more accurately and to avoid asserting output fields not guaranteed by the official docs.
- The route-reflector comparison said next-hop behavior is "Preserved naturally" for confederations. This was softened to reflect RFC 5065, which allows unchanged NEXT_HOP across member-ASes but notes policy may still be needed.
- The summary sentence describing confederation behavior was tightened so it no longer implies that sessions to external peers behave like iBGP.

## Review Notes
- RFC 5065 specifies that AS_CONFED_SEQUENCE and AS_CONFED_SET must not be advertised outside the confederation and that external peers should see only the confederation identifier in AS_PATH.
- FRRouting documents `show bgp ipv6 unicast summary wide` and `show bgp ipv6 unicast neighbors ... advertised-routes` for validating peer state and outbound advertisements, but the exact confederation-related formatting in live output can vary with the routes present.
