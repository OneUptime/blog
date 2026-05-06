# Validation Summary: How to Configure IPv6 ACLs on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv6
- IPv6 ACLs
- DHCPv6
- Cisco router interface and VTY access control

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `ipv6 access-list`, `ipv6 traffic-filter`, and `ipv6 access-class`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IPv6 Access Control Lists configuration guide: https://www.cisco.com/en/US/docs/ios-xml/ios/sec_data_acl/configuration/15-2s/ip6-acls.html
- Cisco IPv6 Unicast Routing guide, `ipv6 unicast-routing`: https://www.cisco.com/en/US/docs/ios-xml/ios/ipv6_basic/configuration/15-2s/ip6-uni-routing.html
- Cisco IOS IPv6 Command Reference, `show ipv6 interface`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco IOS IPv6 Command Reference, `show ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_16.html
- Cisco IOS IPv6 Command Reference, `show ipv6 dhcp binding`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_13.html
- Cisco IOS Debug Command Reference, `debug ipv6 packet` and `debug ipv6 nd`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i4.html
- Cisco IOS Debug Command Reference, `debug ipv6 dhcp`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/i1/db-i1-cr-book/db-i3.html
- Cisco IPv6 network management guide for `ping` and `traceroute` over IPv6: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-36s-book/ip6-mng-apps.html
- Cisco IOS IPv6 Command Reference PDF, `traceroute` syntax: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_17.pdf
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The static route example used invalid IPv6 literals (`2001:db8:remote::/48` and `2001:db8:wan::254`). I replaced them with valid hexadecimal IPv6 addresses so the command is syntactically correct.
- The post claimed IPv6 ACLs were applied to interfaces and VTY lines, but the configuration only defined an ACL. I added `ipv6 traffic-filter` on an interface and `ipv6 access-class` under `line vty` so the post now matches its own description.
- The original ACL denied `2001:db8::/32`, which is the IPv6 documentation prefix used everywhere else in the example. If applied, it would block the sample traffic. I changed the ACL example to filter a narrower example prefix instead.
- The DHCPv6 server example applied a pool to an interface without completing the interface-side stateful DHCPv6 setup. I added an IPv6 address, `ipv6 nd managed-config-flag`, and `no shutdown` so the example is internally consistent.
- The traceroute example included an unverified source-interface form. I changed it to a documented `traceroute ipv6 <destination>` example.
- The conclusion said `ipv6 unicast-routing` must be enabled before any interface IPv6 configuration works. Cisco documents that command as enabling IPv6 unicast forwarding, so I corrected the statement to refer to forwarding behavior instead of basic interface configuration.

## Review Notes
- `2001:db8::/32` is reserved for documentation by RFC 3849, so it is appropriate in examples but should not be used on production networks.
- Cisco’s IPv6 ACL documentation notes that interface-applied IPv6 ACLs filter forwarded traffic, not traffic originated by the router itself.
- `debug ipv6 packet` can generate substantial output and should be used sparingly during troubleshooting.
