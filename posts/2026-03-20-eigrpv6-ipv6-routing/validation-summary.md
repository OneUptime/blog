# Validation Summary: How to Understand EIGRPv6 for IPv6 Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- EIGRPv6
- IPv6 routing
- Cisco EIGRP
- DUAL (Diffusing Update Algorithm)
- EIGRP metric calculation

## Sources Consulted
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: EIGRP Support" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-eigrp-xe.html
- Cisco Support, "EIGRP IPv6 Configuration Example" - https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/113267-eigrp-ipv6-00.html
- Cisco IOS IP Routing Command Reference, EIGRP commands - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-i1.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, "EIGRP/SAF HMAC-SHA-256 Authentication" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ire-sha-256.html
- RFC 7868, "Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP)" - https://www.rfc-editor.org/rfc/rfc7868.html
- Cisco product documentation, "Enhanced Interior Gateway Routing Protocol (EIGRP)" - https://www.cisco.com/site/us/en/products/networking/software/ios-nx-os/enhanced-interior-gateway-routing-protocol-eigrp/index.html

## Issues Found
- The post described EIGRPv6 as strictly proprietary. I updated this to "Cisco-developed" because Cisco now publishes EIGRP openly and current official wording is less absolute than "proprietary."
- The router ID comparison was too absolute. I corrected it to reflect that EIGRPv6 requires a router ID, but it can be derived implicitly from an IPv4 address; manual configuration is required in IPv6-only cases.
- The authentication row used the imprecise label "SHA." I corrected it to "HMAC-SHA-256" to match Cisco documentation.
- The metric formula was technically incorrect because it omitted the required outer `256 ×` factor and the `K5 = 0` special case. I replaced it with the RFC-aligned formula and kept the simplified default metric explanation accurate.

## Review Notes
- The post is technically relevant and suitable for the blog after these corrections.
- The metric section describes the classic EIGRP composite metric. Cisco platforms may also support wide metrics, but omitting that topic is acceptable for an introductory post.
