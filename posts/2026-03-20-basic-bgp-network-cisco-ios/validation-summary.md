# Validation Summary: How to Configure a Basic BGP Network on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- BGP-4
- eBGP
- IP routing
- Autonomous systems

## Sources Consulted
- Cisco IOS XE Gibraltar 16.12.x, "Configuring a Basic BGP Network": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-16-12/irg-xe-16-12-book/configuring-a-basic-bgp-network.html
- Cisco IOS IP Routing: BGP Command Reference, "BGP Commands: M through N": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS IP Routing: BGP Command Reference, "BGP Commands: show ip through Z": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- Cisco IOS IP Routing: Protocol-Independent Command Reference, "IP Routing Protocol-Independent Commands: S through T": https://www.cisco.com/c/en/us/td/docs/ios/iproute_pi/command/reference/iri_book/iri_pi2.html
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)": https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The `State/PfxRcd` explanation overstated what a numeric value means. I changed it to say that a numeric value means the session is established and that the number itself is the count of received prefixes, which matches Cisco's command reference.
- The explanation of the trailing `i` in `show ip bgp` output was inaccurate. I changed it to identify `i` as the BGP ORIGIN code `IGP`, meaning the NLRI is interior to the originating AS, which aligns with RFC 4271 and Cisco's BGP output documentation.

## Review Notes
None.
