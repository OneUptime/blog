# Validation Summary: How to Configure Classic EIGRPv6 on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- EIGRP for IPv6 (classic mode)
- IPv6 unicast routing
- EIGRP named mode
- EIGRPv6 MD5 authentication

## Sources Consulted
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: EIGRP Support" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-eigrp-xe.html
- Cisco IOS IP Routing: EIGRP Command Reference, "I through R" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-i1.html
- Cisco IOS IP Routing: EIGRP Command Reference, "A through H" - https://www.cisco.com/c/en/us/td/docs/ios/iproute_eigrp/command/reference/ire_book/ire_a1.html
- Cisco IOS IPv6 Command Reference, "show ipv6 eigrp topology through show ipv6 nat statistics" - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_14.html
- Cisco Support, "Configure EIGRP Named Mode" - https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/200156-Configure-EIGRP-Named-Mode.html
- Cisco IOS XE 17.x IP Routing Configuration Guide, "EIGRP/SAF HMAC-SHA-256 Authentication" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ire-sha-256.html

## Issues Found
- The configuration example and summary implied that an explicit `eigrp router-id` is always required. Cisco documents that EIGRP can automatically select a router ID from a local IPv4 address, with loopbacks preferred, and that manual configuration is needed when no suitable IPv4-derived router ID is available. I updated the inline comment, the router ID explanation, and the summary wording.
- The comparison table said named EIGRPv6 is active by default. Cisco's named EIGRP documentation shows that named mode also requires `no shutdown` before the process or address family starts. I updated the table to reflect that named EIGRP is also shutdown by default.

## Review Notes
- The post is technically relevant and contains valid Cisco IOS configuration examples.
- The per-interface `ipv6 eigrp <asn>` activation model, `no shutdown` requirement for classic EIGRPv6, passive-interface behavior, MD5 authentication syntax, and verification commands all matched Cisco documentation.
- SHA-256 authentication is supported in named EIGRP on supported platforms and releases; the classic EIGRPv6 authentication commands shown in the post are the MD5-based interface commands documented for classic mode.
