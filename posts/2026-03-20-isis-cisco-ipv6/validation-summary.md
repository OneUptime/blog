# Validation Summary: How to Configure IS-IS on Cisco for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IS-IS
- IPv6
- Multi-Topology IS-IS
- CLNS / NET addressing

## Sources Consulted
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: IS-IS Multitopology Support for IPv6" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-mult-isis-xe.html
- Cisco IOS IPv6 Command Reference, `ipv6 router isis` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i4.html
- Cisco IOS IPv6 Command Reference, `isis ipv6 metric` and `multi-topology` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco IOS IP Routing: IS-IS Command Reference, including `router isis`, `ip router isis`, `metric-style wide`, `show isis neighbors`, `show isis database verbose`, and `show isis topology` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/command/irs-cr-book.pdf
- Cisco support article, "Configuring IS-IS over IPv6" - https://www.cisco.com/c/en/us/support/docs/ip/integrated-intermediate-system-to-intermediate-system-is-is/40262-ipv6-sample-config.html
- Cisco support article, "Configuring IS-IS for IP on Cisco Routers" - https://www.cisco.com/c/en/us/support/docs/ip/integrated-intermediate-system-to-intermediate-system-is-is/13795-is-is-ip-config.html
- RFC 5308, "Routing IPv6 with IS-IS" - https://datatracker.ietf.org/doc/html/rfc5308
- RFC 5120, "M-ISIS: Multi Topology Routing in IS-IS" - https://datatracker.ietf.org/doc/html/rfc5120

## Issues Found
- The configuration omitted `ipv6 unicast-routing`, which Cisco documents as a prerequisite before configuring IPv6 IS-IS on interfaces. I added the command at the start of the example.
- The multitopology example omitted `metric-style wide`, which Cisco documents as required because IPv6 IS-IS TLVs use extended metrics. I added `metric-style wide`.
- The post said `multi-topology` was required for Cisco IS-IS IPv6 in general. Cisco supports both single-topology and multi-topology IPv6 IS-IS, so I narrowed the wording to say `multi-topology` is used when separate IPv4/IPv6 topologies are desired.
- The loopback example used `isis passive`, which is not the Cisco IOS syntax documented for this workflow. I replaced it with `passive-interface Loopback0` under `router isis`.
- The verification command `show isis topology ipv6` had the keyword order reversed. I corrected it to `show isis ipv6 topology`.
- The verification command `show isis interface detail` was not the IOS-documented interface verification form used for IS-IS metrics in the Cisco references I checked. I replaced it with `show clns interface GigabitEthernet0/0`.
- The sample `show ipv6 route isis` output used inconsistent route codes for a level-2-only example. I updated the output to `I2`, matching Cisco IOS IPv6 route-code conventions.

## Review Notes
- The post is now consistent with Cisco IOS / IOS XE CLI conventions. NX-OS uses different interface-level passive syntax, so keeping the article IOS-scoped is important.
- Cisco IOS command availability and output formatting can vary slightly by train, but the corrected commands and behavior match Cisco IOS / IOS XE documentation for IS-IS IPv6.
