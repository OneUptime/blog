# Validation Summary: How to Configure BGP IPv6 Unicast Address Family on Cisco

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cisco IOS
- Cisco IOS XE
- BGP
- Multiprotocol BGP for IPv6
- IPv6 unicast routing
- OSPFv3 redistribution

## Sources Consulted
- Cisco IOS XE 17.x IP Routing Configuration Guide, "IPv6 Routing: Multiprotocol BGP Extensions for IPv6" - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_ip6-mbgp-ext-xe.html
- Cisco IOS IP Routing: BGP Command Reference, "BGP Commands: M through N" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-m1.html
- Cisco IOS IPv6 Command Reference, "show bgp ipv6 neighbors through show crypto isakmp peers" - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_12.html
- Cisco IOS IPv6 Command Reference, "IPv6 Commands: show bgp ipv6 ne to show ipv6 cef sw" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s1.html
- Cisco IOS IPv6 Command Reference, "IPv6 Commands: n to re" - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-m1.html
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" - https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- Invalid IPv6 example literals were used: `2001:db8:peer::2` and `2001:db8:remote::/48` are not valid IPv6 addresses. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The IPv6 eBGP example included a `neighbor ... description` line. The Cisco IOS/XE BGP command references I checked do not document that syntax for IPv6 neighbors in this context, so I removed the line to keep the example within documented command forms.
- The iBGP section marked `next-hop-self` as required. That is inaccurate for establishing an IPv6 iBGP session, so I removed those lines rather than presenting them as mandatory.
- The final verification command used `show bgp neighbors ... | include AFI`. I replaced it with the documented IPv6-specific neighbor command `show bgp ipv6 unicast neighbors ...`, which directly shows neighbor capabilities and address-family details.

## Review Notes
- Cisco documentation varies slightly by software train for some show commands. Some IOS XE references also use `show ip bgp ipv6 unicast ...`, while Cisco IPv6 command references document `show bgp ipv6 unicast ...`. The form used in the post is valid.
- `redistribute ospf 1 include-connected` is consistent with Cisco's documented IPv6 redistribution syntax, but redistribution policy should normally be filtered in production deployments.
