# Validation Summary: How to Configure Named EIGRP for IPv6 on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE CLI
- EIGRP Named Mode
- EIGRP for IPv6
- IPv6 routing
- EIGRP authentication

## Sources Consulted
- Cisco Support: Configure EIGRP Named Mode - https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/200156-Configure-EIGRP-Named-Mode.html
- Cisco IOS IP Routing: EIGRP Command Reference, A through H - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-a1.html
- Cisco IOS IP Routing: EIGRP Command Reference, I through R - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_eigrp/command/ire-cr-book/ire-i1.html
- Cisco IOS XE 17.x IP Routing Configuration Guide: EIGRP/SAF HMAC-SHA-256 Authentication - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ire-sha-256.html
- Cisco IOS XE 17.x IP Routing Configuration Guide: BFD Support for EIGRP IPv6 - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ire-bfd-ipv6.html

## Issues Found
- The post used `network 2001:db8:1::/64` under `address-family ipv6 ...`. Cisco's EIGRP command reference states that named IPv6 configurations do not support the `network` command in address-family mode. I replaced that with interface selection in `af-interface` submode using `shutdown` / `no shutdown`.
- The dual-stack example showed IPv4 activation correctly but did not show the corresponding IPv6 interface activation method for named mode. I added an `af-interface` example to make the IPv6 portion technically correct.
- The HMAC-SHA-256 example omitted the required encryption-type argument. I corrected it to `authentication mode hmac-sha-256 0 <password>` based on Cisco's authentication command syntax.
- I added the `ipv6 unicast-routing` prerequisite to the primary IPv6 example so the configuration reflects the required IPv6 routing context.

## Review Notes
- The post is now technically accurate for Cisco IOS / IOS XE named EIGRP syntax as documented in the cited Cisco references.
- The examples still assume the participating interfaces already have IPv6 addressing configured; the post focuses on named EIGRP syntax rather than full interface provisioning.
- Cisco documents `shutdown` / `no shutdown` controls for EIGRP IPv6 in router, address-family, and address-family interface modes, but the default state is not shut down.
