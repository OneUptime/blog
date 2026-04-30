# Validation Summary: How to Configure IPv6 on Juniper Junos Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6
- Static routing
- OSPFv3
- BGP
- Junos firewall filters

## Sources Consulted
- Juniper Networks, Protocol Family and Interface Address Properties: https://www.juniper.net/documentation/us/en/software/junos/interfaces-fundamentals-evo/interfaces-fundamentals/topics/topic-map/protocol-family-interface-address-properties.html
- Juniper Networks, IPv6 Neighbor Discovery: https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper Networks, router-id statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/router-id-edit-routing-options.html
- Juniper Networks, Filtering Operational Command Output: https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/filtering-operational-command.html
- Juniper Networks, static routing statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-edit-routing-options.html
- Juniper Networks, discard statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/discard-edit-routing-options.html
- Juniper Networks, Configuring Route Aggregation: https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config-route-aggregation.html
- Juniper Networks, interface statement reference for OSPF/OSPFv3: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/interface-edit-protocols-ospf.html
- Juniper Networks, family statement reference for BGP: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-bgp.html
- Juniper Networks, Basic BGP Routing Policies: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/basic-routing-policies.html
- Juniper Networks, Firewall Filter Match Conditions for IPv6 Traffic: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper Networks, show ipv6 neighbors command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, show bgp summary command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-bgp-summary.html
- Juniper Networks, show ospf3 database command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ospf3-database.html
- Juniper Networks, ping command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, traceroute command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/traceroute.html

## Issues Found
- The verification example used `| grep`, but Junos operational mode documents `match`, `find`, and `except` as supported pipe filters. I changed the command to `show interfaces ge-0/0/0 detail | match inet6`.
- Several sample IPv6 next-hop addresses used non-hexadecimal text such as `isp` and `isp2`, which is invalid IPv6 syntax. I replaced them with valid documentation-safe IPv6 addresses.
- The loopback comment implied that an IPv6 loopback address was being configured for router ID purposes. Junos requires a 32-bit `router-id` for OSPFv3 and IPv6 BGP, so I corrected the comment to avoid tying the IPv6 loopback address to router ID selection.
- The BGP origination example used an aggregate route without explaining that Junos aggregate routes need contributing routes to become active. I replaced that example with a static discard route for `2001:db8::/48`, which provides an active route that can be exported by BGP.
- The BGP export policy used `orlonger`, which could export more-specific prefixes in addition to the intended aggregate. I narrowed the route filter to `exact` so the example advertises only the documented aggregate prefix.
- The stanza section was labeled as a full configuration even though it was only a partial example. I renamed it to `Example Configuration in Stanza Format` to match the content.

## Review Notes
- The firewall filter example is valid as a basic IPv6 ACL example. On some Junos OS Evolved platforms, Juniper recommends reviewing `next-header` or `payload-protocol` behavior for IPv6 firewall filters when building production filters.
