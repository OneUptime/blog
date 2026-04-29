# Validation Summary: How to Configure IPv6 Firewall Filters on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6 addressing and static routing
- Stateless IPv6 firewall filters (`family inet6`)
- DHCPv6 local server and address-assignment pools
- IPv6 Neighbor Discovery and router advertisements

## Sources Consulted
- Juniper, "Guidelines for Configuring Firewall Filters": https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-stateless-guidelines-for-configuring.html
- Juniper, "Firewall Filter Match Conditions for IPv6 Traffic": https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper, "`ping` | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper, "IPv6 Neighbor Discovery": https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper, "`show ipv6 neighbors` | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper, "`static` (Routing Options)": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-edit-routing-options.html
- Juniper, "DHCPv6 Server": https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper, "DHCPv6 Address-Assignment Pools": https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-address-asignment-pools-security-devices.html
- Juniper, "`dhcp-attributes` (Address-Assignment Pools)": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcp-attributes-edit-access.html
- Juniper, "`traceoptions` (Protocols IPv6 Neighbor Discovery)": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/traceoptions-edit-protocols-router-advertisement.html
- OneUptime homepage: https://oneuptime.com/

## Issues Found
- The prerequisite claimed Junos OS 12.1 or later, but the post uses the IPv6 firewall-filter `next-header` match, which Juniper documents as supported starting in Junos OS 13.3R6. I updated the minimum version accordingly.
- The IPv6 static-route example used invalid IPv6 literals (`remote` and `wan`) and labeled a `reject` route as a black-hole route. I replaced the literals with valid documentation-style example addresses and changed the default route action to `discard`, which matches the comment.
- The firewall filter used `next-header icmpv6`. Juniper documents `icmp6` as the preferred visible synonym and `icmpv6` as a hidden synonym, so I updated the example to `icmp6`.
- The DHCPv6 section mixed DHCPv6 local-server configuration with relay-only `active-server-group` usage, omitted the `dhcpv6` hierarchy, used invalid IPv6 literals, and used `name-server` instead of the DHCPv6 `dns-server` attribute. I rewrote the snippet to a valid DHCPv6 local-server example with matching interface, address pool, and router-advertisement configuration.
- The verification section used `show arp no-resolve table inet6`, but Juniper documents `show ipv6 neighbors` as the IPv6 replacement for `show arp`. I replaced it with a valid interface-scoped `show ipv6 neighbors` command and corrected the IPv6 `ping` example to documented argument order.
- The traceoptions section described router-advertisement tracing as general IPv6 routing debug. I corrected the wording and quoted the trace filename to match the CLI reference.

## Review Notes
- The post is technically correct after the fixes above.
- Firewall-filter and DHCP feature support can still vary by Junos platform and release; Juniper Feature Explorer remains the authoritative compatibility check for a specific device.
