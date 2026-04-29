# Validation Summary: How to Configure IPv6 Static Routes on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6 static routing
- Junos firewall filters for IPv6
- IPv6 Neighbor Discovery (NDP)
- DHCPv6 local server configuration

## Sources Consulted
- Juniper Networks, "Configure Static Routes" - https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config_static-routes.html
- Juniper Networks, "discard (routing-options)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/discard-edit-routing-options.html
- Juniper Networks, "show ipv6 neighbors" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper Networks, "show arp" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-arp.html
- Juniper Networks, "ping" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, "Routing Instances Overview" - https://www.juniper.net/documentation/us/en/software/junos/routing-overview/topics/concept/routing-instances-overview.html
- Juniper Networks, "DHCPv6 Server" - https://www.juniper.net/documentation/us/en/software/junos/dhcp/topics/topic-map/dhcpv6-server.html
- Juniper Networks, "[edit system]" hierarchy reference - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/topic-map/hierarchy-edit-system.html
- Juniper Networks, "dhcp-attributes (Address-Assignment Pools)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/dhcp-attributes-edit-access.html
- Juniper Networks, "range (Address-Assignment Pools)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/range-edit-access.html
- Juniper Networks, "Firewall Filter Match Conditions for IPv6 Traffic" - https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/firewall-filter-match-conditions-for-ipv6-traffic.html
- Juniper Networks, "Filtering Operational Command Output" - https://www.juniper.net/documentation/us/en/software/junos/cli/topics/topic-map/filtering-operational-command.html
- OneUptime homepage - https://oneuptime.com/

## Issues Found
- The static-route example used invalid IPv6 addresses (`2001:db8:remote::/48` and `2001:db8:wan::254`). I replaced them with valid documentation-prefix addresses based on Juniper's IPv6 static-route examples.
- The post labeled `reject` as a black-hole route. In Junos, `discard` is the silent-drop form, while `reject` returns an unreachable response. I updated the example to use `discard`.
- The firewall-filter example used `next-header icmpv6`. Juniper documents `icmp6` as the preferred keyword, so I updated the filter accordingly.
- The DHCPv6 server snippet used the wrong hierarchy for a DHCPv6 local server and included options that do not belong in this example (`active-server-group`, `server-identifier-override`, and `name-server`). I moved the configuration under `dhcp-local-server dhcpv6`, corrected the pool range formatting, and replaced `name-server` with `dns-server`.
- The verification section used `show arp ... inet6`, which is an IPv4 ARP command rather than the IPv6 neighbor-cache command. I replaced it with `show ipv6 neighbors interface ge-0/0/0.0`.
- The ping example used `routing-instance default`, but `default` cannot be used as a Junos routing-instance name. I removed that option and kept a valid IPv6 ping example.
- The prerequisites referred to "shared" access in a way that did not map cleanly to the actual Junos CLI mode names. I updated that wording to use `configure` and `configure exclusive`.
- The description and overview claimed the post covered aggregate routes and routing instances, but the article does not. I narrowed the wording to match the actual content.

## Review Notes
- The post now validates as a general Junos guide. DHCPv6 local-server deployments can require additional surrounding configuration on some platforms, such as interface addressing and, on SRX platforms, relevant security or host-inbound settings.
