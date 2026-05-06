# Validation Summary: How to Configure BGP IPv4 Address Family Under the New Address-Family Model

## Status
validated

## Post Type
Guide

## Technologies Covered
- Border Gateway Protocol (BGP)
- Multiprotocol BGP (MP-BGP)
- IPv4 unicast address family
- IPv6 unicast address family
- Cisco IOS / IOS XE BGP configuration
- MPLS L3VPN / VRF-aware BGP

## Sources Consulted
- Cisco IOS IP Routing: BGP Command Reference, `address-family ipv4`, `bgp default ipv4-unicast`, and `auto-summary`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS IP Routing: BGP Command Reference, `neighbor activate` and `neighbor route-map`: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html
- Cisco IOS IP Routing: BGP Command Reference, `show ip bgp ipv4`, `show ip bgp summary`, and `synchronization`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- IP Routing: BGP Configuration Guide, Cisco IOS Release 15SY, IPv4 VRF address-family behavior and `no bgp default ipv4-unicast` ordering: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/15-sy/irg-15-sy-book/irg-bgp4.html
- IP Routing Configuration Guide, Cisco IOS XE 17.x, examples using `show ip bgp ipv4 summary` and `show ip bgp ipv4 unicast summary`: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-bgp-dynamic-neighbors.html
- RFC 4760, Multiprotocol Extensions for BGP-4: https://datatracker.ietf.org/doc/html/rfc4760

## Issues Found
- The introduction overstated IPv4 unicast activation behavior under the address-family model. I corrected it to explain that explicit `neighbor ... activate` is required for IPv4 unicast when `no bgp default ipv4-unicast` is configured before the neighbor is defined.
- Step 2 implied that `no auto-summary` and `no synchronization` must be disabled as part of the address-family model. Cisco documentation shows both are already disabled by default on modern IOS, so I corrected the text to present them as legacy commands that may still appear in older configurations.
- Step 3’s heading and lead-in were slightly too specific for the examples shown. I adjusted the wording so it accurately describes multiple address families within one BGP process while still noting that a single neighbor can participate in more than one family.
- Step 4 needed an ordering caveat. Cisco documents that `no bgp default ipv4-unicast` must be configured before the relevant `neighbor ... remote-as` statements to affect those neighbors, so I added that clarification.
- The conclusion described the address-family model as separating “routing protocols and address families,” which is conceptually inaccurate. I corrected this to describe separation of routes and policy by address family, and clarified that `no bgp default ipv4-unicast` is used when explicit IPv4 activation is desired.

## Review Notes
- The configuration snippets are syntactically valid for Cisco IOS-style BGP configuration after the corrections above.
- Verification command syntax can vary slightly across Cisco IOS and IOS XE trains; the post’s `show ip bgp ipv4 unicast` examples are supported in Cisco documentation, but some platforms also document `show ip bgp ipv4 summary` or `show ip bgp summary`.
