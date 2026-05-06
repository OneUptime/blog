# Validation Summary: How to Configure IPv6 DHCP Server on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- DHCPv6
- IPv6
- ICMPv6 Router Advertisements
- IPv6 Neighbor Discovery

## Sources Consulted
- Cisco, "IPv6 Configuration Guide, Cisco IOS Release 12.2SR - Implementing DHCP for IPv6" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/12-2sr/ipv6-12-2sr-book/ip6-dhcp.html
- Cisco, "IPv6 Implementation Guide, Cisco IOS Release 15.2S - Implementing DHCP for IPv6" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-2s/ipv6-15-2s-book/ip6-dhcp.html
- Cisco, "Troubleshoot IPv6 Dynamic Address Assignment with Cisco Router and Microsoft Windows PC" https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/213272-troubleshoot-ipv6-dynamic-address-assign.html
- Cisco, "Cisco IOS IPv6 Command Reference - IPv6 Commands: ipv6 a to ipv6 g" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco, "Cisco IOS IPv6 Command Reference - IPv6 Commands: show ipv6 cef tr to show ipv6 in" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco, "Cisco IOS Debug Command Reference - Commands I through L - debug ip rtp header-compression through debug ipv6 icmp" https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i3.html
- Cisco, "Cisco Catalyst 1200 Series CLI Guide - IP System Management Commands" https://www.cisco.com/c/en/us/td/docs/switches/campus-lan-switches-access/Catalyst-1200-and-1300-Switches/cli/C1200-cli/ip-system-management-commands.html
- OneUptime homepage (link verification only) https://oneuptime.com/

## Issues Found
- The prerequisite version was incorrect for stateful DHCPv6 host address assignment. I changed `Cisco IOS 12.4(6)T or later` to `Cisco IOS 12.4(24)T or later` because Cisco documents DHCPv6 Individual Address Assignment as introduced in 12.4(24)T, while earlier releases supported only stateless DHCPv6.
- The static route example used invalid IPv6 literals (`remote` and `wan` are not valid hexadecimal hextets). I replaced them with valid documentation-prefix addresses.
- The client-facing interface configuration was incomplete for a working stateful DHCPv6 deployment. I added an IPv6 address, `ipv6 nd managed-config-flag`, `ipv6 nd prefix default 1800 1800 no-autoconfig`, and `no shutdown` so hosts can receive Router Advertisements and use DHCPv6 for address assignment without also creating an SLAAC address from the RA.
- The `traceroute ipv6` example used an interface name after `source`, but Cisco documents `source` as an IP address argument. I updated the example to `source 2001:db8:1::1`.
- The conclusion overstated what `ipv6 unicast-routing` does. I corrected it to reflect that the command enables IPv6 forwarding and Router Advertisements; DHCPv6 still does not provide the default gateway.

## Review Notes
- Cisco documentation distinguishes among stateless DHCPv6, prefix delegation, and DHCPv6 Individual Address Assignment. This post is specifically about stateful host address assignment, so the Individual Address Assignment feature baseline is the relevant one.
- `2001:db8::/32` remains appropriate in examples because it is the documentation prefix reserved for sample configurations.
