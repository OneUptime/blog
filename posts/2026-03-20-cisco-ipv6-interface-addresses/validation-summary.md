# Validation Summary: How to Configure IPv6 Addresses on Cisco Interfaces

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv6
- DHCPv6
- IPv6 Neighbor Discovery (NDP)
- IPv6 access control lists
- Static IPv6 routing

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `ipv6 address`, `ipv6 address ... eui-64`, and `ipv6 address ... link-local`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference, `address prefix` and `ipv6 dhcp server`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-a1.html and https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_05.html
- Cisco IOS IPv6 Command Reference, `ipv6 nd managed-config-flag`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS IPv6 Command Reference, `show ipv6 interface`, `show ipv6 dhcp binding`, and `show ipv6 neighbors`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html and https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_15.html
- Cisco IOS IPv6 Command Reference, `ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS Debug Command Reference, `debug ipv6 packet`, `debug ipv6 nd`, and `debug ipv6 dhcp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-i1-cr-book/db-i4.html and https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i3.html
- IPv6 Addressing and Basic Connectivity Configuration Guide, Cisco IOS Release 15M&T: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_basic/configuration/15-mt/ip6b-15-mt-book/ip6-uni-routing.html
- Troubleshoot IPv6 Dynamic Address Assignment with Cisco Router and Microsoft Windows PC: https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/213272-troubleshoot-ipv6-dynamic-address-assign.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The minimum version was too low. The post used `address prefix` in a DHCPv6 pool, which Cisco documents as introduced in IOS 12.4(24)T, so the prerequisite was corrected from 12.4(6)T to 12.4(24)T.
- The basic configuration section claimed coverage of static, EUI-64, and link-local addressing but only showed a static address. I added valid Cisco IOS examples for `ipv6 address ... eui-64` and `ipv6 address ... link-local`.
- The static route example used invalid IPv6 literals (`remote` and `wan` are not valid hexadecimal hextets). I replaced them with valid RFC 3849 documentation-prefix addresses.
- The DHCPv6 interface example was incomplete for stateful DHCPv6 use. I added an IPv6 interface address and `ipv6 nd managed-config-flag` so attached hosts are instructed to use DHCPv6 for address assignment.
- The traceroute example used a less certain source-interface form and the ping/traceroute targets did not line up with the routed example. I changed them to straightforward destination examples against the routed documentation prefix.
- The conclusion overstated the role of `ipv6 unicast-routing`. Interface IPv6 addressing can be configured without it, but the router needs it to forward IPv6 traffic between interfaces. I corrected that wording.

## Review Notes
- The post now consistently uses the RFC 3849 documentation prefix `2001:db8::/32`, which is appropriate for examples and should not be used in production.
- The DHCPv6 example is valid as written, but hosts may still also form SLAAC addresses unless `ipv6 nd prefix ... no-autoconfig` is configured on the interface.
- The debug commands are valid Cisco IOS commands, but `debug ipv6 packet` in particular should be used cautiously on production devices because it can generate significant output and load.
