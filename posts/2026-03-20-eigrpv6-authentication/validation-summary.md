# Validation Summary: How to Configure EIGRPv6 Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE
- EIGRPv6
- EIGRP Named Mode
- MD5 authentication
- HMAC-SHA-256 authentication
- IPv6 routing

## Sources Consulted
- Cisco IOS XE 17.x IPv6 Routing: EIGRP Support: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-route-eigrp-xe.html
- Cisco IOS XE 17.x EIGRP/SAF HMAC-SHA-256 Authentication: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ire-sha-256.html
- Cisco IOS IP Routing: EIGRP Command Reference, A through H: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-a1.html
- Cisco IOS IP Routing: EIGRP Command Reference, S through V: https://www.cisco.com/c/en/us/td/docs/ios/iproute_eigrp/command/reference/ire_book/ire_s1.html
- Configure EIGRP Named Mode (Cisco): https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/200156-Configure-EIGRP-Named-Mode.html

## Issues Found
- The Named EIGRP SHA-256 examples omitted the required encryption-type argument in `authentication mode hmac-sha-256`. Updated both SHA-256 snippets to use `authentication mode hmac-sha-256 0 ...`, which matches Cisco's documented syntax for an unencrypted password.
- The Classic EIGRPv6 MD5 section said both neighbors must use the same key chain name. Updated this to require matching valid keys and aligned send/accept lifetimes instead, because interoperability depends on the active key material and validity windows rather than the local key-chain label.
- The verification section said neighbors should show as `Established`. Updated this because EIGRP neighbor output does not use an `Established` adjacency state; the practical check is that neighbors remain present in the table.

## Review Notes
- Named EIGRP address families are typically brought up with `no shutdown` when first created. This post is scoped to authentication snippets rather than full end-to-end EIGRPv6 deployment, so no broader process-activation changes were added.
- Key rotation with accept/send lifetimes depends on accurate device time. In production, routers should have synchronized clocks, typically via NTP.
