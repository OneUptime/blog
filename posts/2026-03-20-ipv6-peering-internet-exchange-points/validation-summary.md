# Validation Summary: How to Configure IPv6 Peering at Internet Exchange Points - Points

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BGP
- Internet Exchange Points (IXPs)
- Route servers
- Cisco IOS-XE
- RPKI / Route Origin Validation
- BGP communities
- IPv6 prefix filtering

## Sources Consulted
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 5398: Autonomous System (AS) Number Reservation for Documentation Use - https://www.rfc-editor.org/rfc/rfc5398
- RFC 6811: BGP Prefix Origin Validation - https://www.rfc-editor.org/rfc/rfc6811
- RFC 7454: BGP Operations and Security - https://www.rfc-editor.org/rfc/rfc7454.html
- RFC 7947: Internet Exchange BGP Route Server - https://www.rfc-editor.org/rfc/rfc7947.html
- RFC 7948: Internet Exchange BGP Route Server Operations - https://www.rfc-editor.org/rfc/rfc7948.html
- Cisco IOS XE 17.x, BGP—Origin AS Validation - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-origin-as-0.html
- Cisco IOS XE, Configuring a BGP Route Server - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/configuration/xe-3s/irg-xe-3s-book/configuring-a-bgp-route-server.html
- Cisco IOS IPv6 Command Reference, `show bgp ipv6 neighbors` and `show bgp ipv6 unicast summary` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Cisco IOS IP Routing: BGP Command Reference, `bgp enforce-first-as` and `neighbor soft-reconfiguration inbound` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- DE-CIX Route Server Guides - https://www.de-cix.net/en/resources/service-information/route-server-guides
- AMS-IX Route Servers - https://www.ams-ix.net/ams/documentation/ams-ix-route-servers
- BCIX Route Servers - https://www.bcix.de/ixp/content/0/route-servers
- Equinix Internet Exchange FAQs - https://docs.equinix.com/internet-exchange/ix-faq

## Issues Found
- The original IXP example used DE-CIX-like IPv6 addresses and route-server labels that did not match published route-server addressing. I replaced them with documentation-only IPv6 prefixes from RFC 3849 and documentation ASNs from RFC 5398 so the sample is safe and unambiguous.
- The Cisco IOS-XE route-server example omitted `no bgp enforce-first-as`. Cisco and the IETF route-server RFCs require disabling first-AS enforcement for route-server client sessions because route servers preserve the original AS_PATH. I added the command.
- The RPKI example used an invalid IPv6 literal (`2001:db8:rpki::10`) and placed `address-family ipv6` outside `router bgp`. I replaced the validator address with a valid documentation IPv6 address and moved the policy application back under `router bgp`.
- The RPKI explanation said the configuration would reject "hijacked routes", which overstates what Route Origin Validation proves. I changed the wording to reject routes with an invalid origin-validation state.
- The route-filtering prose said the sample accepted only specific peer prefixes, but the configuration actually showed a loose baseline filter that blocks defaults, over-specific routes, ULA, and documentation space. I corrected the text to match the configuration.
- The verification example used `| head -30`, which is not standard Cisco IOS-XE `show` filtering syntax. I removed it and left the native `show bgp` command example.

## Review Notes
- The example intentionally uses documentation IPv6 prefixes and documentation ASNs.
- The `network 2001:db8::/32` statement is syntactically correct, but in production Cisco IOS-XE will only originate the prefix if it is present in the local routing table.
- The inbound prefix-list shown is a loose baseline filter. Per-peer filters derived from IRR/RPKI data are stricter and generally preferable when operationally practical.
