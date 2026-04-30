# Validation Summary: How to Configure GRE Tunnels for IPv6 on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE tunnel interfaces
- GRE over IPv4 carrying IPv6
- IPv6 addressing, static routing, MTU, and TCP MSS adjustment
- OSPFv3
- Cisco extended ACLs
- IKEv2 and IPsec tunnel protection for GRE

## Sources Consulted
- Cisco IOS Interface and Hardware Component Command Reference, `tunnel mode`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/interface/command/ir-cr-book/ir-t2.html
- Cisco IOS IP Application Services Command Reference, `ipv6 tcp adjust-mss`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp/command/iap-cr-book/iap-i2.html
- Cisco IOS IPv6 Command Reference, `ipv6 mtu` and `ipv6 ospf`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS IPv6 Command Reference, `show ipv6 ospf neighbor` and `show ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_15.html
- Cisco IOS IPv6 Command Reference, `ipv6 route`: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- Cisco OSPFv3 configuration guide: https://www.cisco.com/en/US/docs/ios-xml/ios/ipv6/configuration/15-0sy/ip6-ospf.html
- Cisco IOS XE GRE over IPsec configuration guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-12/configuration_guide/sec/b_1712_sec_9300_cg/m9-1712-configuring-gre-over-ipsec.html
- Cisco IOS Debug Command Reference, `debug ip packet detail`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-i1-cr-book/db-i3.html
- Cisco IOS Debug Command Reference index: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-s1-cr-book/db-s1-cr-book_CLT_chapter.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 791, Internet Protocol: https://www.rfc-editor.org/rfc/rfc791
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200

## Issues Found
- The post set `ipv6 tcp adjust-mss 1436` while also setting `ipv6 mtu 1476`. That MSS value was too high for IPv6/TCP over a 1476-byte MTU. I corrected both tunnel examples and the summary to `ipv6 tcp adjust-mss 1416`.
- The MTU verification section used `show interface Tunnel0 | include MTU` and interpreted the generic interface MTU (`17916`) as the effective tunnel MTU. Cisco distinguishes the protocol-specific IPv6 MTU from the nonprotocol-specific interface MTU, so I changed the example to check `Tunnel transport MTU 1476 bytes` and kept the `show ipv6 interface` verification.
- The ping note claimed a 1400-byte IPv6 ping proved PMTUD. That only confirms packets smaller than the configured tunnel MTU pass, so I corrected the explanation.
- The GRE-with-IPsec section used an incomplete crypto-map example while describing IKEv2. I replaced it with a Cisco-documented IKEv2/IPsec-profile approach using `tunnel protection ipsec profile` on the tunnel interface.
- The verification section included `debug tunnel`, which I could not validate in Cisco’s IOS router debug command references. I removed that line and kept the documented `debug ip packet detail` example.

## Review Notes
- The OSPFv3 examples use classic interface-based Cisco IOS syntax (`ipv6 router ospf` and `ipv6 ospf ... area ...`), which remains valid on IOS/IOS XE. Some newer platforms also support `router ospfv3` address-family syntax.
- The IPsec section is still intentionally abbreviated, but the configuration path now matches Cisco’s documented GRE-over-IPsec tunnel protection model.
