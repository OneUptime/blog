# Validation Summary: How to Enable IPv6 Routing on Cisco IOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- IPv6
- Cisco Express Forwarding (CEF)
- IPv6 Neighbor Discovery / Router Advertisements
- Static IPv6 routing

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `ipv6 cef` and `ipv6 enable`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_05.html
- Cisco IOS IPv6 Command Reference, `ipv6 address eui-64`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference, `ipv6 nd prefix`, `ipv6 nd ra interval`, `ipv6 nd ra lifetime`, `ipv6 nd ra suppress`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS IPv6 Command Reference, `show ipv6 neighbors`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_15.html
- Cisco IOS IPv6 Command Reference, `ping ipv6`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_10.html
- IP Addressing Configuration Guide, Cisco IOS XE 17.x, IPv6 addressing and basic connectivity: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_ip6-add-basic-conn-xe.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849

## Issues Found
- The post enabled `ipv6 cef` without the required `ip cef` prerequisite. I added `ip cef` before `ipv6 cef` in the example commands and full configuration because Cisco documents that IPv4 CEF must be enabled first on classic IOS.
- The interface section described a link-local-only setup but did not include the command needed to enable IPv6 processing without a global address. I added `ipv6 enable`, which auto-generates the link-local address.
- The Router Advertisement examples used older hyphenated syntax (`ipv6 nd ra-interval`, `ipv6 nd ra-lifetime`, and `ipv6 nd suppress-ra`). I updated them to the newer syntax (`ipv6 nd ra interval`, `ipv6 nd ra lifetime`, and `ipv6 nd ra suppress`) documented for Cisco IOS 12.4(2)T and later.
- The Step 3 heading and comment implied that `ipv6 nd prefix` enables Router Advertisements. I corrected the wording so the section accurately describes tuning RA behavior, and noted the documented default behavior for Ethernet interfaces.
- The full configuration used invalid IPv6 literals (`2001:db8:wan::/64`, `2001:db8:lan::/64`). I replaced them with valid documentation addresses under `2001:db8::/32`, because IPv6 text fields must be hexadecimal.
- The verification example traceroute targeted the router's own interface address instead of a remote peer. I changed it to `2001:db8:1::2` so it reflects an actual path test.
- I removed quotes from the interface `description` examples to match standard Cisco IOS CLI syntax.

## Review Notes
- The post is technically correct after these fixes for classic Cisco IOS syntax. Some newer IOS XE platforms may differ in defaults or platform behavior around CEF, but the corrected commands align with Cisco's documented IOS IPv6 command reference and the post's stated Cisco IOS 12.4(6)T-or-later target.
