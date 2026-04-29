# Validation Summary: How to Configure IS-IS on Juniper for IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Juniper Junos OS
- IS-IS
- IPv6
- IS-IS multitopology (`ipv6-unicast`)
- Junos operational verification commands

## Sources Consulted
- Juniper: Example: Configuring IS-IS IPv4 and IPv6 Unicast Topologies - https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/example/isis-ipv6-unicast-multitopology.html
- Juniper: topologies (Protocols IS-IS) - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/topologies-edit-protocols-isis.html
- Juniper: level (IS-IS Interfaces) - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/level-edit-protocols-isis-interface.html
- Juniper: interface (Protocols IS-IS) - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/interface-edit-protocols-isis.html
- Juniper: Understanding IS-IS Configuration - https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/isis-configuring-understanding.html
- Juniper: Verifying the IS-IS Configuration on a Router in a Network - https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/task/isis-network-configuration-introduction.html
- Juniper: Configuring IS-IS Authentication - https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/routing-configuring-is-is-authentication.html
- Juniper: show isis adjacency - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-isis-adjacency.html
- Juniper: show isis database - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-isis-database.html
- Juniper: show isis interface - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-isis-interface.html
- Juniper: show route table - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-table.html
- Juniper: level (Global IS-IS) - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/level-edit-protocols-isis.html
- RFC 5308: Routing IPv6 with IS-IS - https://www.rfc-editor.org/info/rfc5308
- RFC 7775: IS-IS Route Preference for Extended IP and IPv6 Reachability - https://www.rfc-editor.org/info/rfc7775

## Issues Found
- The basic configuration example was incomplete for a working IPv6 IS-IS setup. It was missing the loopback NET (`family iso address`), `family iso` on IS-IS-enabled interfaces, and IPv6 addressing on the interfaces participating in the IPv6 topology. I added the required interface and loopback lines so the example matches Junos requirements.
- The full hierarchical example used `topologies ipv6-unicast;`, which is not the correct hierarchy form in Junos. I changed it to `topologies { ipv6-unicast; }`.
- The full hierarchical example enabled IS-IS on `ge-0/0/1.0` in the protocol stanza but omitted the corresponding interface configuration. I added the missing `ge-0/0/1` interface block with `inet`, `inet6`, and `iso`.
- The IPv6-specific metric commands used the wrong syntax. Junos documents this as `ipv6-unicast-metric` under the interface level hierarchy, so I changed the commands to `set protocols isis interface ... level 2 ipv6-unicast-metric ...`.
- The per-interface authentication example used `authentication-key` and `authentication-type` under `interface ... level 2`, which does not match the documented Level 2 interface hello-authentication syntax. I corrected it to `hello-authentication-key` and `hello-authentication-type`.
- The route-verification command and sample output used a less canonical command ordering. I normalized them to `show route table inet6.0 protocol isis`, which matches Juniper CLI reference examples.
- The explanation `AD 18 = ...` was Junos-inaccurate terminology. Junos refers to this value as route preference, not administrative distance. I corrected the wording and preserved the actual defaults: Level 2 internal `18`, Level 1 internal `15`.
- The overview and summary overstated `ipv6-unicast` as a blanket requirement for IPv6. I narrowed the wording so the post correctly describes configuring a separate IPv6 IS-IS topology.

## Review Notes
- The post now accurately documents Junos IS-IS multitopology IPv6 configuration rather than generic IPv6-with-IS-IS in all modes.
- On SRX platforms and newer Junos releases, IS-IS can additionally require packet mode under `[edit security forwarding-options family iso]`; this is a platform-specific caveat and was not necessary to add to a router-focused post.
- The metric values shown are within the classic IS-IS range. If a future revision uses metrics above `63`, Junos wide metrics configuration should be covered as well.
