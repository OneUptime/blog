# Validation Summary: How to Configure IPv6 Overlay and Underlay in SD-WAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SD-WAN
- Linux `iproute2`
- SIT tunneling
- IPsec
- strongSwan
- VXLAN
- WireGuard
- `tcpdump`

## Sources Consulted
- Linux `ip-tunnel(8)` man page - https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Linux `ip-link(8)` man page, VXLAN type support - https://man7.org/linux/man-pages/man8/ip-link.8.html
- WireGuard `wg-quick(8)` man page - https://www.man7.org/linux/man-pages/man8/wg-quick.8.html
- WireGuard Quick Start - https://www.wireguard.com/quickstart/
- strongSwan Configuration Files documentation - https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Installation documentation - https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan Introduction to the IPsec Protocol - https://docs.strongswan.org/docs/5.9/howtos/ipsecProtocol.html
- RFC 4291, "IP Version 6 Addressing Architecture" - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" - https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The post used multiple invalid IPv6 literals such as `2001:db8:overlay::1`, `2001:db8:site-b::/64`, and `2001:db8:wan-c::1`. IPv6 text fields must be hexadecimal, so I replaced them with valid documentation addresses from `2001:db8::/32`.
- The Linux example used `mode ip6gre` while describing an IPv6 overlay over an IPv4 underlay. Per `ip-tunnel(8)`, `ip6gre` is an IPv6-encapsulated mode, so I corrected the example to use `mode sit` for IPv6-over-IPv4.
- The StrongSwan example showed `/etc/ipsec.conf` but started `strongswan.service`. Current strongSwan documentation distinguishes the `ipsec.conf`/`starter` backend from the `swanctl`/`strongswan.service` path, so I changed the startup command to `strongswan-starter` and labeled the config as the legacy stroke interface.
- The StrongSwan underlay and overlay example addresses were also invalid IPv6 literals. I replaced them with valid documentation prefixes and explicit IPv6 endpoint addresses.
- The VXLAN example comment said it added a route for a remote subnet, but the command installed a `/128` host route. I corrected the comment to match the command.
- The WireGuard section description said "IPv6 overlay over IPv4 underlay" even though the config also carried IPv4 overlay traffic and included an IPv6 underlay peer. I corrected the description to reflect a dual-stack overlay with mixed IPv4/IPv6 underlay endpoints.
- The monitoring section claimed the underlay capture should show an inner IPv6 payload. That is not correct for encrypted tunnels such as IPsec ESP and WireGuard, so I changed the note to describe the outer ESP/UDP packets and added VXLAN's UDP port `4789` to the capture filter.
- The introduction and wrap-up slightly overstated two behaviors: SD-WAN overlays are not always encrypted, and dual-stack failover is platform/configuration dependent. I narrowed both statements to make them technically accurate.

## Review Notes
- The post is now technically consistent, but the strongSwan `ipsec.conf` example still uses a deprecated backend. A future refresh could convert it to `swanctl.conf` if the blog wants to align with strongSwan's current preferred interface.
- The example prefixes use RFC 3849 documentation space and are suitable for articles and labs, not production routing.
