# Validation Summary: How to Configure IPv6 Router Advertisements on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- Cisco IOS-XE
- IPv6 Neighbor Discovery
- IPv6 Router Advertisements
- SLAAC
- DHCPv6 flags
- RDNSS / DNSSL

## Sources Consulted
- Cisco IOS IPv6 Command Reference - IPv6 Commands: `ipv6 mo to ipv6 ospf da`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS IPv6 Command Reference - IPv6 Commands: `show ipv6 cef tr to show ipv6 in`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS IPv6 Command Reference - IPv6 Commands: `show ipv6 na to show ipv6 pr`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s4.html
- Cisco IOS IPv6 Command Reference - `debug crypto ipv6 ipsec through debug ipv6 pim`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_03.html
- IPv6 Configuration Guide, Cisco IOS XE Gibraltar 16.12.x (Catalyst 3850 Switches) - Configuring IPv6 Unicast Routing: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3850/software/release/16-12/configuration_guide/ipv6/b_1612_ipv6_3850_cg/configuring_ipv6_unicast_routing.html
- Security Configuration Guide, Cisco IOS XE Gibraltar 16.10.x (Catalyst 9500 Switches) - DHCPv6 Options Support: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-10/configuration_guide/sec/b_1610_sec_9500_cg/dhcpv6_options_support.html
- Security Configuration Guide, Cisco IOS XE Gibraltar 16.12.x (Catalyst 3650 Switches) - CAPWAP Access Controller DHCPv6 Option: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3650/software/release/16-12/configuration_guide/sec/b_1612_sec_3650_cg/dhcpv6_options_support.html
- RFC 4861 - Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862 - IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8106 - IPv6 Router Advertisement Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106

## Issues Found
- The post used `ipv6 nd ra-interval` and `ipv6 nd ra-lifetime`. I changed these to `ipv6 nd ra interval` and `ipv6 nd ra lifetime` to match the documented Cisco IOS command syntax.
- The verification step after `ipv6 unicast-routing` used `show ipv6 interface brief`, which does not directly verify that the global routing knob is configured. I changed it to `show running-config | include ipv6 unicast-routing`.
- The post used `show ipv6 nd interface GigabitEthernet0/0` for ND prefix verification. I changed this to `show ipv6 interface GigabitEthernet0/0 prefix`, which matches the Cisco IOS command reference for viewing configured ND prefixes on an interface.
- The DNS-via-RA section made an overly broad IOS-XE version claim and used a generic `infinite` RDNSS example plus a DNSSL command that varies across IOS-XE platforms and releases. I narrowed the wording to supported IOS-XE releases, changed the RDNSS examples to the documented numeric lifetime form, and removed the universal DNSSL command example.
- The sample `show ipv6 interface` output said the advertised default router preference was `Medium` even though the configuration example set it to `high`. I corrected the sample output to `High`.

## Review Notes
- Cisco documentation for DNS RA options is platform-specific on IOS-XE. Catalyst platform guides document DNSSL syntax variants such as `ipv6 nd ra dns search-list ...` and `ipv6 nd ra dns-search-list domain ...`, so a single universal DNSSL command example is misleading.
- Cisco platform guides sometimes reference RFC 6106 for DNS RA options, but RFC 8106 obsoletes RFC 6106 and is the current standards-track reference.
