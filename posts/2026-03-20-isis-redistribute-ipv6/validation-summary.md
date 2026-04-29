# Validation Summary: How to Redistribute IPv6 Routes into IS-IS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IS-IS
- IPv6
- Cisco IOS XE
- Junos OS
- FRRouting
- OSPFv3
- BGP
- Route redistribution

## Sources Consulted
- Cisco IOS XE IP Routing: ISIS Configuration Guide, IPv6 Routing: Route Redistribution: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/configuration/xe-16/irs-xe-16-book/ip6-route-isis-redis-xe.html
- Cisco IOS IPv6 Command Reference, `redistribute (IPv6)`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-m1.html
- Cisco IOS IPv6 Command Reference, `default-information originate (IPv6 IS-IS)`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_04.html
- Cisco IOS IPv6 Command Reference, `ipv6 router isis`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i4.html
- Junos OS CLI reference, `export (IS-IS)`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/export-edit-protocols-isis.html
- Junos OS CLI reference, `metric (Protocols IS-IS)`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/metric-edit-protocols-isis.html
- Junos OS CLI reference, `show isis route`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-isis-route.html
- Junos OS routing policy overview: https://www.juniper.net/documentation/us/en/software/junos/junos-overview/topics/concept/routing-policy-overview.html
- FRRouting IS-IS documentation, stable 10.5: https://docs.frrouting.org/en/stable-10.5/isisd.html
- RFC 5308, Routing IPv6 with IS-IS: https://datatracker.ietf.org/doc/html/rfc5308

## Issues Found
- The Cisco examples used the wrong IPv6 IS-IS redistribution form. IPv6 redistribution on Cisco IOS XE is configured under `router isis` and `address-family ipv6`, not with `redistribute ipv6 ... level-2` in plain router mode. I corrected the commands accordingly.
- The Cisco example claimed `redistribute connected` would inject connected IPv6 routes into IS-IS. Cisco documents that IPv6 IS-IS ignores connected redistribution; connected prefixes are advertised when IS-IS runs on the interface or the interface is passive. I replaced that example with interface-level IS-IS enablement.
- The overview incorrectly stated that redistributed IPv6 routes are always External Level-2 routes with higher administrative distance. That is not universally true, and on Cisco IOS XE the redistribution `metric-type` defaults to `internal`. I corrected the explanation.
- The route-map example used an invalid IPv6 prefix, `2001:db8:branch::/48`, and the verification output used an invalid link-local address, `FE80::asbr`. I replaced them with valid IPv6 literals.
- The FRRouting section used per-protocol IS-IS redistribution commands that do not match current FRRouting IS-IS documentation. I updated the section to current table-based IS-IS redistribution syntax and corrected the default-route origination syntax.
- The section titled "Setting Default Metric for Redistributed Routes" actually showed default-route origination commands. I renamed the section and fixed the Cisco and FRRouting commands to match current IS-IS default-route behavior.
- The Juniper verification command was updated to `show isis route inet6`, which is the documented command that exposes IS-IS route type information such as `ext`.

## Review Notes
FRRouting IS-IS redistribution syntax is version-sensitive. Current FRRouting stable documentation shows table-based redistribution for IS-IS, so older per-protocol examples should not be presented as current behavior.
