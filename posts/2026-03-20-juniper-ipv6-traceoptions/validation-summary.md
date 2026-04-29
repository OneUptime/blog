# Validation Summary: How to Debug IPv6 Issues on Juniper with traceoptions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6 interface and static route configuration
- IPv6 Neighbor Discovery (NDP) and router advertisements
- Junos `traceoptions`
- Junos stateless firewall filters (`family inet6`)
- DHCPv6 local server
- OneUptime Ping/IP and SNMP monitoring

## Sources Consulted
- Juniper CLI reference for `show ipv6 neighbors`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper IPv6 Neighbor Discovery guide: https://www.juniper.net/documentation/us/en/software/junos/neighbor-discovery/topics/topic-map/ipv6-neighbor-discovery.html
- Juniper CLI reference for `traceoptions` under `[edit protocols router-advertisement]`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/traceoptions-edit-protocols-router-advertisement.html
- Juniper CLI reference for `configure`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/configure.html
- Juniper overview of the `configure` command: https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/configure-command.html
- Juniper static routing documentation: https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config_static-routes.html
- Juniper CLI reference for `discard` static routes: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/discard-edit-routing-options.html
- Juniper firewall filter match conditions for IPv6 traffic: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper DHCPv6 local server overview: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcpv6-local-server-overview.html
- Juniper DHCPv6 server configuration guide: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper common DHCP interface-group configuration guide: https://www.juniper.net/documentation/us/en/software/junos/subscriber-mgmt-sessions/topics/topic-map/dhcp-common-config-interface-group.html
- Juniper CLI reference for `dhcp-attributes`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcp-attributes-edit-access.html
- Juniper DHCPv6 address-assignment pools guide: https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-address-asignment-pools-security-devices.html
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Ping Monitor docs: https://oneuptime.com/docs/monitor/ping-monitor
- OneUptime SNMP Monitor docs: https://oneuptime.com/docs/monitor/snmp-monitor

## Issues Found
- The post said `protocols router-advertisement traceoptions` could debug general IPv6 routing and forwarding. I narrowed the description, overview, traceoptions caption, and conclusion to Neighbor Discovery and router-advertisement debugging because Juniper documents this hierarchy specifically for IPv6 Neighbor Discovery.
- The static-route example used invalid IPv6 literals (`remote`, `wan`). I replaced them with valid documentation-safe IPv6 addresses under `2001:db8::/32`.
- The post labeled `reject` as a black-hole route. I changed the example to `discard`, because Junos uses `discard` for silent drop behavior while `reject` returns ICMP unreachable.
- The firewall-filter example used `next-header icmpv6`. Juniper documents `icmp6` as the preferred visible CLI form, so I updated the match condition.
- The DHCPv6 server example mixed relay-only syntax (`active-server-group`) and the wrong hierarchy into a DHCPv6 local-server example. I rewrote it to use `system services dhcp-local-server dhcpv6 group ... interface ...`.
- The DHCPv6 pool example used invalid IPv6 literals (`lan`) and the wrong DHCP attribute (`name-server`). I replaced the addresses with valid IPv6 examples and changed the DHCPv6 option to `dns-server`.
- The verification command `show arp no-resolve table inet6` was not a valid Junos IPv6 neighbor-cache command. I replaced it with `show ipv6 neighbors interface ge-0/0/0`, which Juniper documents for IPv6 neighbors.
- The ping example used `routing-instance default`, but Junos reserves `default` and documents `master` as the default routing instance. I removed the unnecessary routing-instance argument from the sample ping.
- The prerequisites referenced "configure exclusive or shared". Junos documents `configure`, `configure private`, and `configure exclusive`; I corrected the wording to valid configuration-mode usage.
- The monitoring section referred to "ICMP monitors". I aligned the wording with OneUptime's documented monitor types by changing it to Ping or IP monitors.

## Review Notes
- Juniper cautions that `traceoptions` can affect scale, performance, and security exposure. It should be enabled temporarily and disabled after the needed logs are collected.
- Some DHCPv6 local server capabilities are platform- and release-specific. Readers should confirm support for their exact hardware and Junos release in Juniper platform documentation or Feature Explorer.
