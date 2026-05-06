# Validation Summary: How to Verify BGP IPv6 Routes on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- Border Gateway Protocol (BGP)
- IPv6 routing
- Cisco routing table verification commands

## Sources Consulted
- Cisco IOS IPv6 Command Reference: `show bgp ipv6` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-r1.html
- Cisco IOS IPv6 Command Reference: `show bgp ipv6 neighbors` and `show bgp ipv6 summary` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_12.html
- Cisco IOS IPv6 Command Reference: `show bgp ipv6 neighbors` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Cisco IOS IPv6 Command Reference: `show ipv6 route` - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html

## Issues Found
- Several sample IPv6 addresses and prefixes were invalid because they used non-hexadecimal text such as `peer`, `ibgp`, `backup`, `remote`, and `local` inside IPv6 fields. I replaced them with valid `2001:db8::/32` documentation addresses so the commands and output are syntactically correct.
- The primary neighbor-inspection command used `show bgp neighbors <peer-address>`. I changed it to `show bgp ipv6 unicast neighbors <peer-address>` to match Cisco's IPv6-specific BGP neighbor command reference.
- The `TblVer` explanation was imprecise. I corrected it to reflect Cisco's definition: it is the last BGP table version sent to that neighbor, so lag versus the main table version indicates pending updates rather than a generic “routes are being processed” state.
- The route-code explanation for `>` said the route was installed in the routing table. I corrected this to “best path selected by BGP,” which is the Cisco-defined meaning and avoids implying RIB installation in cases such as RIB failure.
- The section title for per-neighbor `routes` output implied all received routes. I changed it to “Accepted Routes from a Peer” because Cisco documents `routes` as the accepted subset of `received-routes`.
- The summary claimed `show ipv6 route bgp` confirms installation in the FIB. I corrected this to the IPv6 routing table, because `show ipv6 route` is a RIB view rather than a direct FIB/CEF view.

## Review Notes
- Cisco documentation shows some platform-specific command variants in newer IOS XE trains, especially `show ip bgp ipv6 unicast` on certain Catalyst platforms. The commands kept in the post are valid Cisco IOS-style IPv6 BGP commands, but readers on some platforms may also encounter the `show ip bgp ...` form in current command references.
