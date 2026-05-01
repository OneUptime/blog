# Validation Summary: How to Configure EIGRPv6 Stub Routing

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Cisco EIGRP for IPv6 (EIGRPv6)
- Cisco IOS / IOS XE routing configuration
- IPv6 routing
- DUAL query suppression
- EIGRP named mode

## Sources Consulted
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: EIGRP Support": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-eigrp-xe.html
- Cisco IOS IPv6 Command Reference, `eigrp stub`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_04.html
- Cisco IOS IPv6 Command Reference, `ipv6 router eigrp`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS Debug Command Reference, `debug eigrp packet`, `debug eigrp fsm`, and `debug ipv6 eigrp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/e1/db-e1-cr-book/db-e1.html and https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i3.html
- Cisco IOS IP Routing: EIGRP Command Reference, `show eigrp address-family neighbors`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-s1.html
- Cisco Support, "Configure EIGRP Named Mode": https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/200156-Configure-EIGRP-Named-Mode.html
- Cisco C9350 EIGRP Configuration Guide, updated February 18, 2026: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/eigrp/eigrp-configuration-guide/routing-eigrp.html
- Cisco Design Zone, routed access layer EIGRP verification example: https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Campus/routed-ex.html

## Issues Found
- The stub options table incorrectly said `stub static` advertises static and connected routes. Cisco’s command reference says that when stub keywords are specified, only the selected route types are advertised. I corrected `stub static` to static only and added the missing `stub redistributed` option.
- The named EIGRPv6 configuration example omitted `no shutdown`. Cisco’s named mode documentation shows the address family must be brought out of shutdown for the process to run, so I added `no shutdown`.
- The verification sample used non-literal or weakly supported output examples (`FE80::spoke`, square-bracket stub formatting, and a spoke-side `show ipv6 eigrp` stub display that was not well grounded in official references). I replaced that with a valid-looking neighbor detail example and a direct configuration check on the spoke.
- The receive-only section heading incorrectly labeled the mode as "Summary Routes" even though `receive-only` advertises no routes. I corrected the heading.
- The convergence measurement section used `debug ipv6 eigrp fsm`, which is not the documented syntax for this purpose. I replaced it with `debug eigrp packet query` and corrected the explanation so it reflects query suppression, not guaranteed purely local resolution.

## Review Notes
- The post is technically sound after correction, but it assumes the base EIGRPv6 process already exists. A full deployment still requires EIGRPv6 to be enabled on the participating interfaces, IPv6 routing to be enabled, and a router ID to be available or manually configured.
- `receive-only` cannot be combined with other stub keywords according to Cisco’s command reference.
- The review was documentation-based. No Cisco IOS/IOS XE device was available in this workspace to execute the router commands live.
