# Validation Summary: How to Verify IPv6 Configuration on Cisco with show Commands

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv6
- DHCPv6
- Neighbor Discovery Protocol (NDP)
- IPv6 access control lists (ACLs)
- ICMPv6 troubleshooting

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `show ipv6 interface`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS IPv6 Command Reference, `show ipv6 neighbors`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_15.html
- Cisco IOS IPv6 Command Reference, `show ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html
- Cisco IOS IPv6 Command Reference, `show ipv6 dhcp binding`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS Debug Command Reference, `debug ipv6 dhcp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i3.html
- Cisco IOS Debug Command Reference, `debug ipv6 packet` and `debug ipv6 nd`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i4.html
- Cisco IOS IPv6 Command Reference, `ipv6 unicast-routing`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco IP Routing: Protocol-Independent Configuration Guide, IPv6 Static Routing prerequisites: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/configuration/xe-3s/iri-xe-3s-book/ip6-route-static-xe.html
- Cisco Support, Troubleshoot IPv6 Dynamic Address Assignment with Cisco Router and Microsoft Windows PC: https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/213272-troubleshoot-ipv6-dynamic-address-assign.html
- Cisco IOS Configuration Fundamentals Command Reference, `traceroute`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/Cisco_IOS_Configuration_Fundamentals_Command_Reference/test_cable-diagnostics_through_xmodem.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The static route example used invalid IPv6 literals (`2001:db8:remote::/48` and `2001:db8:wan::254`). I replaced them with valid documentation-prefix IPv6 addresses because IPv6 hextets must use hexadecimal notation.
- The DHCPv6 interface example was incomplete for a working stateful DHCPv6 setup. I added an interface IPv6 address, `ipv6 nd managed-config-flag`, and `no shutdown` so the interface can advertise DHCPv6 usage and operate correctly.
- The traceroute example used an interface name after the `source` keyword. I changed it to an IPv6 source address, which matches Cisco traceroute syntax, and aligned the example destination with the surrounding static-route example.
- The conclusion incorrectly stated that `ipv6 unicast-routing` is required before any interface IPv6 configuration will work. I corrected that to the accurate Cisco behavior: it is required for forwarding IPv6 traffic and routing features.

## Review Notes
- The `2001:db8::/32` documentation prefix is appropriate for examples and was retained.
- The minimum version note of `Cisco IOS 12.4(6)T or later` is conservative for the command set in the article; several referenced commands were introduced earlier, but the statement is still acceptable.
- Cisco documentation warns that `debug ipv6 packet`, `debug ipv6 nd`, and `debug ipv6 dhcp` can generate substantial output and should be used only during focused troubleshooting.
