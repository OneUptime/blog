# Validation Summary: How to Configure 6in4 Manual Tunnels on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS / IOS XE tunnel interfaces
- IPv6 over IPv4 manual tunneling (6in4 / protocol 41)
- IPv6 static routing
- IPv6 Neighbor Discovery and Router Advertisements
- IPv4 ACLs for tunnel filtering

## Sources Consulted
- Cisco, "Manually Configured IPv6 over IPv4 Tunnels": https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-man-tunls-xe.pdf
- Cisco, "Cisco IOS IPv6 Command Reference - IPv6 Commands: ipv6 su to m" (`ipv6 unicast-routing`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i5.html
- Cisco, "Cisco IOS IPv6 Command Reference - IPv6 Commands: ipv6 mo to ipv6 ospf da" (`ipv6 nd ra interval`, `ipv6 mtu`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco, "Cisco IOS IPv6 Command Reference - IPv6 Commands: ipv6 ospf de to ipv6 sp" (`ipv6 route`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i4.html
- Cisco, "Cisco IOS IP Application Services Command Reference - ip tcp adjust-mss through ipv6 tcp adjust-mss": https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp/command/iap-cr-book/iap-i2.html
- Cisco, "Cisco IOS Debug Command Reference - Commands I through L" (`debug ip packet`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/debug/command/db-i1-cr-book/db-i2.html
- Cisco, "Protecting Your Core: Infrastructure Protection Access Control Lists" (supported protocol 41 identification): https://www.cisco.com/c/en/us/support/docs/ip/access-lists/43920-iacl.html
- RFC 4213, "Basic Transition Mechanisms for IPv6 Hosts and Routers": https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 6691, "TCP Options and Maximum Segment Size (MSS)": https://www.rfc-editor.org/rfc/rfc6691.html
- RFC 8200, "Internet Protocol, Version 6 (IPv6) Specification": https://www.rfc-editor.org/rfc/rfc8200

## Issues Found
- Added `ipv6 unicast-routing` to the basic configuration. Cisco documents that IPv6 unicast forwarding is disabled by default, so the original routed example would not forward IPv6 traffic as described.
- Replaced deprecated `ipv6 nd ra-interval` with `ipv6 nd ra interval`. Cisco documents the spaced form as the replacement command.
- Removed the static route that pointed the delegated `/48` back into the tunnel and clarified that LAN interfaces should use subnets from the delegated prefix while the broker routes that prefix to the tunnel endpoint. This correction is an inference from standard IPv6 routing behavior plus Cisco's static-route semantics: the original route would send the locally delegated aggregate in the wrong direction.
- Replaced invalid sample IPv6 addresses in the site-to-site example (`link`, `siteA`, `siteB`) with valid documentation prefixes. The original values were not legal IPv6 syntax.
- Corrected `ipv6 tcp adjust-mss` from `1440` to `1420` for a 1480-byte IPv6 MTU. RFC 6691 and RFC 8200 require TCP MSS over IPv6 to be computed as MTU minus 60 bytes of fixed IPv6 and TCP headers.
- Tightened the protocol 41 ACL example to permit only the configured broker source and the router's tunnel-source IPv4 destination, which better matches the text's stated goal of allowing only the authorized tunnel endpoint.
- Replaced `debug ip packet detail 41` with a valid ACL-filtered `debug ip packet 141 detail` example. Cisco documents `debug ip packet` as accepting an optional ACL filter, not a raw protocol number argument.
- Removed the unqualified `debug tunnel` example and used documented packet-level debugging instead. In the router command references consulted, Cisco documents `debug tunnel route-via` for route-via troubleshooting, but I could not validate the generic `debug tunnel` form used in the original post.
- Generalized the troubleshooting note from "MTU not set to 1480" to "MTU/PMTUD mismatch." RFC 4213 allows multiple static tunnel MTUs in the 1280-1480 range and discusses PMTUD, so packet loss is not uniquely caused by omitting 1480.

## Review Notes
Cisco's command references note that support varies by platform and software release, so operators should confirm tunnel and debug feature availability on the exact IOS / IOS XE image they are using. The post is technically sound after the fixes above.
