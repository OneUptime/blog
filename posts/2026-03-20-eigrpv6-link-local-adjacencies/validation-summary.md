# Validation Summary: How to Understand EIGRPv6 Link-Local Address Adjacencies

## Status
validated

## Post Type
Guide

## Technologies Covered
- EIGRP for IPv6
- IPv6 link-local addressing
- Cisco IOS / IOS XE CLI

## Sources Consulted
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: EIGRP Support" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-eigrp-xe.html
- Cisco IOS IPv6 Command Reference, `show ipv6 eigrp interfaces` and `show ipv6 eigrp neighbors` - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s2.html
- Cisco Support, "EIGRP IPv6 Configuration Example" - https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/113267-eigrp-ipv6-00.html
- Cisco Support, "Understand and Use the Enhanced Interior Gateway Routing Protocol" - https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/16406-eigrp-toc.html
- Cisco Support, "Understand the IPv6 Link-Local Address" - https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/113328-ipv6-lla.html
- RFC 7868, "Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP)" - https://www.rfc-editor.org/rfc/rfc7868.html

## Issues Found
- The troubleshooting section said Hello and Hold timers on both sides "must match." Cisco documentation states EIGRP neighbors can still form adjacency even when hello and hold timers do not match, so this was corrected to say the timers should be set appropriately rather than matched.
- The multicast-address section implied `ff02::a` was specifically for Hello, Query, and Reply packets, and then stated Updates are unicast once adjacency is established. That was inaccurate. EIGRP acknowledgments and replies are neighbor-specific unicast packets, while updates may be either unicast or multicast depending on context. The wording was corrected accordingly.
- The interface verification example showed the link-local address as `[TENTATIVE]`, which is not representative of normal steady-state operation. The sample output was adjusted to a standard enabled-interface form.

## Review Notes
Classic `show ipv6 eigrp ...` commands used in the post are still documented for Cisco IOS / IOS XE. Some newer platforms and named-mode configurations also document `show eigrp address-family ipv6 ...` variants.
