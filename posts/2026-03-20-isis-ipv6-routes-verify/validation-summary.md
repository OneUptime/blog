# Validation Summary: How to Verify IS-IS IPv6 Routes

## Status
validated

## Post Type
Guide

## Technologies Covered
- IS-IS for IPv6 routing
- Cisco IOS / IOS XE routing verification
- Juniper Junos OS routing verification
- FRRouting route verification
- Linux `iproute2` kernel route inspection

## Sources Consulted
- Cisco IOS XE IP Routing Protocol-Independent Command Reference: `show ipv6 route` https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/command/iri-cr-book/iri-cr-s1.html
- Cisco IOS IS-IS Command Reference: `show isis topology` https://www.cisco.com/c/en/us/td/docs/ios/iproute_isis/command/reference/irs_book/irs_is2.html
- Cisco IOS XE IPv6 Routing: IS-IS Support for IPv6 https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-isis-xe.html
- Juniper `show route protocol` command reference https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-protocol.html
- Juniper `show isis spf` command reference https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-isis-spf.html
- Juniper IS-IS default preference values https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/level-edit-protocols-isis.html
- FRRouting IS-IS documentation https://docs.frrouting.org/en/stable-10.0/isisd.html
- FRRouting Zebra documentation https://docs.frrouting.org/en/stable-10.2/zebra.html
- RFC 5308: Routing IPv6 with IS-IS https://www.rfc-editor.org/rfc/rfc5308
- Local `ip-route(8)` man page
- Local `ip -6 route help`
- Local `/etc/iproute2/rt_protos`

## Issues Found
- The Cisco topology command was incorrect. I changed `show isis topology ipv6` to the documented `show isis ipv6 topology`.
- The FRRouting topology command used an unsupported `ipv6-unicast` qualifier. I changed it to `show isis topology`, which is the documented show command.
- The Juniper topology command was not a documented operational command for this purpose. I changed it to `show isis spf results topology ipv6-unicast`, which is the documented IPv6-unicast SPF/topology view.
- The Cisco explanation for route code `IA` was overly specific and could mislead readers. I changed it to the generic and documented meaning: an IS-IS interarea route.
- The Cisco IS-IS database example used field names that did not match Cisco’s documented output. I updated the sample lines to use documented IPv6-related output fields from `show isis database detail`.
- The FRRouting/Linux kernel example incorrectly implied that the Linux kernel metric tracks the IS-IS SPF metric per route. I corrected the sample and added a note that the Linux kernel metric is not the FRR IS-IS route metric.
- The Juniper administrative distance comparison only showed the Level 2 value. I updated it to include both documented internal preference values: Level 1 and Level 2.
- The product name `JunOS` was corrected to `Junos OS`.

## Review Notes
- `ip -6 route show proto isis` is valid on current Linux systems where `iproute2` provides the standard `isis` protocol mapping in `rt_protos`; this matched the local environment used for validation.
- FRRouting’s Linux kernel metric is a Zebra/kernel installation detail and should not be read as the IS-IS SPF cost shown in `vtysh`.
