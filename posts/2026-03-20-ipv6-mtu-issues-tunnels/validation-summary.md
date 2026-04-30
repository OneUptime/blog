# Validation Summary: How to Fix IPv6 MTU Issues in Tunnels

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- MTU and PMTUD
- Linux `iproute2` tunnel configuration
- GRE, SIT/6in4, VXLAN, WireGuard, OpenVPN, IPsec, and Teredo
- `ip6tables` TCP MSS clamping
- `tcpdump` and `tracepath`

## Sources Consulted
- `ip-tunnel(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `ip-route(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ping(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tracepath.8%40%40iputils.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel networking documentation on MTU semantics: https://docs.kernel.org/6.15/networking/netdevices.html
- `wg-quick(8)` WireGuard manual page: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- RFC 2473, Generic Packet Tunneling in IPv6 Specification: https://www.rfc-editor.org/rfc/rfc2473.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784.html
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348.html
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201.html
- RFC 4380, Teredo: https://www.rfc-editor.org/rfc/rfc4380
- RFC 3032, MPLS Label Stack Encoding: https://www.rfc-editor.org/rfc/rfc3032

## Issues Found
- The PMTUD section referenced `net.ipv6.conf.<if>.path_mtu_discovery`, which is not a valid Linux IPv6 sysctl. I replaced it with correct `ip tunnel` PMTUD guidance and route inspection based on `ip-tunnel(8)`.
- The `ping6` examples had incorrect packet-size comments. I switched them to `ping -6`, corrected the actual total packet sizes, and changed the small probe to a true 1280-byte IPv6 minimum-MTU test.
- The post used `ip -6 route show cache` to inspect PMTU state. Current `ip-route(8)` documentation notes that route-cache output is obsolete, so I replaced it with `ip route get` / `ip -6 route get` guidance.
- The post used `tracepath6`, which is not the current documented interface on modern iputils systems. I updated it to `tracepath -6`.
- The Teredo overhead row overstated base encapsulation overhead. I corrected it to `28+ bytes` / `1472 bytes or lower` based on RFC 4380's UDP-over-IPv4 encapsulation format and optional origin indication.
- The IPsec-related table rows implied exact inner MTUs even though ESP overhead varies by mode and cryptographic parameters. I changed those rows to lower-bound phrasing.
- The WireGuard row was ambiguous about the underlay. I clarified that the `60-byte` / `1420-byte` example is for an IPv4 underlay.
- The MSS-clamping example matched packets entering the tunnel interface. I changed it to clamp forwarded SYN packets leaving the tunnel interface, which matches the described use case more accurately.

## Review Notes
- `ip6tables` commands remain technically valid, but many current Linux distributions implement them via the nftables backend.
- OpenVPN and IPsec encapsulation overhead can vary by cipher, mode, and options, so those table entries should still be treated as approximate planning values rather than universal constants.
