# Validation Summary: How to Debug IPv6 Issues on Cisco with debug Commands

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv6
- DHCPv6
- Neighbor Discovery (ND/NDP)
- Cisco IOS debug and show commands

## Sources Consulted
- Cisco IOS Debug Command Reference: `debug ipv6 packet`, `debug ipv6 nd`, and `debug ipv6 dhcp`  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-i1-cr-book/db-i4.html  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i3.html
- Cisco IOS IPv6 Command Reference: `ipv6 route`, `show ipv6 dhcp binding`, `show ipv6 neighbors`, `show ipv6 interface`, and `ping ipv6`  
  https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html  
  https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.html
- Cisco IPv6 configuration guides for IPv6 addressing/routing behavior and DHCPv6 examples  
  https://www.cisco.com/en/US/docs/ios-xml/ios/ipv6_basic/configuration/15-2s/ip6-uni-routing.html  
  https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-0s/ipv6-15-0s-book/ip6-dhcp.html  
  https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3850/software/release/3se/consolidated_guide/configuration_guide/b_consolidated_3850_3se_cg/b_consolidated_3850_3se_cg_chapter_010101.pdf
- OneUptime homepage URL check  
  https://oneuptime.com/

## Issues Found
- The static route example used invalid IPv6 literals (`2001:db8:remote::/48` and `2001:db8:wan::254`). I replaced them with valid documentation-prefix IPv6 addresses so the command is syntactically correct.
- The DHCPv6 server example applied `ipv6 dhcp server` to an interface without also showing an IPv6 address or the managed-config RA flag. I added `ipv6 address 2001:db8:1::1/64` and `ipv6 nd managed-config-flag` so the example better reflects a working stateful DHCPv6 setup.
- The verification examples used the router’s own interface address for `ping` and `traceroute`, which is not a meaningful routed-path check. I changed them to use a remote example address in the routed prefix.
- The post said `ipv6 unicast-routing` must be enabled before any interface IPv6 configuration will work. Cisco’s IPv6 configuration guide shows that `ipv6 address` enables IPv6 processing on the interface, while `ipv6 unicast-routing` enables forwarding globally. I corrected the prerequisite wording, setup comment, and conclusion to reflect that distinction.

## Review Notes
- The debug commands themselves are valid in Cisco IOS, but `debug ipv6 packet` can generate substantial output; Cisco documents it with an explicit caution. The post’s reminder to disable debugging afterward is appropriate.
- Command availability can still vary by platform, image, and feature set even within supported Cisco IOS or IOS XE families. The post’s version floor is conservative enough for the commands shown.
