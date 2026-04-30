# Validation Summary: How to Configure IPv6 on Cisco IOS Routers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Cisco IOS
- IPv6 addressing and routing
- SLAAC
- OSPFv3
- IPv6 ACLs
- DHCPv6

## Sources Consulted
- Cisco IOS IPv6 Command Reference, `ipv6 cef`, `ipv6 address autoconfig`, and `ipv6 traffic-filter`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Cisco IOS IPv6 Command Reference, `ipv6 route` and `ipv6 router ospf`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco IOS IPv6 Command Reference, `router-id (IPv6)`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_11.html
- Cisco IOS IPv6 Command Reference, `show ipv6 ospf neighbor` and `show ipv6 dhcp binding`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_15.html
- Cisco IOS IPv6 Command Reference, IPv6 ACL `deny` syntax: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-d2.html
- Cisco IOS IPv6 Command Reference, `ipv6 nd managed-config-flag`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco support article, stateful DHCPv6 server example and RA flags: https://www.cisco.com/c/en/us/support/docs/ip/ip-version-6-ipv6/213272-troubleshoot-ipv6-dynamic-address-assign.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201

## Issues Found
- The post enabled `ipv6 cef` without first enabling `ip cef`. Cisco documents `ip cef` as a prerequisite, so `ip cef` was added before `ipv6 cef`.
- The static-route examples used invalid IPv6 literals such as `2001:db8:isp::1`, `2001:db8:isp2::1`, and `2001:db8:1:1::web`. These were replaced with valid documentation-prefix IPv6 addresses.
- The default-route and ACL examples were inconsistent with the post's own interface roles. `GigabitEthernet0/0` is the LAN-facing interface in the post because it hosts the static LAN address and DHCPv6 server, while `GigabitEthernet0/1` is the autoconfigured upstream interface. The default route and inbound ACL were corrected to use the upstream side accordingly.
- The ACL example would have broken normal traffic flow as written. It applied an inbound ACL on the LAN-facing interface, used `permit tcp any any established` with a comment that incorrectly described it as permitting "established and related" traffic, and then relied on the implicit deny. The misleading line was removed, a valid host address was used, and `permit ipv6 any any` was added so the example now blocks the intended SSH traffic without dropping all other IPv6 traffic.
- The DHCPv6 server example attached a stateful DHCPv6 pool to the interface without setting the managed-address RA flag. `ipv6 nd managed-config-flag` was added so hosts are instructed to use DHCPv6 for address assignment.
- The introduction made an unnecessary version-specific claim about IPv6 being "production-ready since IOS 12.4". This was softened to a version-agnostic statement because the exact cutoff was not needed for the tutorial and varies across IPv6 features.

## Review Notes
- The OSPFv3 syntax in the post uses the classic Cisco IOS form (`ipv6 router ospf` and `ipv6 ospf ... area ...`). That remains valid for classic IOS examples, although many newer IOS XE guides also use `router ospfv3` with address families.
- Cisco IOS IPv6 ACLs include implicit `permit icmp any any nd-na` and `permit icmp any any nd-ns` entries before the final implicit deny once the ACL has at least one entry. The corrected post does not depend on that behavior for ordinary traffic flow.
