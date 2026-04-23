# Validation Summary: How to Route All IPv6 Traffic Through a VPN Tunnel

## Status
validated

## Post Type
Technical configuration guide

## Technologies Covered
- IPv6 routing
- WireGuard and wg-quick
- OpenVPN
- IPsec/IKEv2 with strongSwan swanctl
- Linux iproute2
- ip6tables
- NetworkManager and nmcli
- curl, ping, and traceroute

## Sources Consulted
- WireGuard wg-quick(8) manual: https://www.man7.org/linux/man-pages/man8/wg-quick.8.html
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- strongSwan swanctl.conf documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan virtual IP address documentation: https://docs.strongswan.org/docs/latest/features/vip.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- Local command help: `openvpn --help`, `ip -6 route help`, `ip6tables -p ipv6-icmp -h`, `nmcli --version`

## Issues Found
- The WireGuard, OpenVPN, and strongSwan examples used invalid IPv6 prefixes such as `fd00:wg::2/128`, `fd00:vpn::/64`, and `fd00:ipsec::/64`. IPv6 hextets must be hexadecimal, so these were changed to valid ULA-style example prefixes.
- The WireGuard route verification expected a main-table default route with fixed metrics. wg-quick uses policy routing and a fwmark/table for default routes, so the verification now checks all route tables and refers to table `51820` rather than a metric.
- The OpenVPN client example included `tun-ipv6`, which current OpenVPN accepts only as an ignored compatibility option. It was removed.
- The OpenVPN full-tunnel example used `route-ipv6 ::/0`; for an IPv6 transport endpoint this can misroute the control connection. It now uses the documented `redirect-gateway ipv6` client/server push pattern, and the verification notes the resulting `2000::/4` and `3000::/4` routes.
- The strongSwan swanctl example mixed client-side EAP authentication with responder-side address pool configuration. It now requests an IPv6 virtual IP with `vips = ::`, uses `local_ts = dynamic`, and keeps `remote_ts = ::/0` for full-tunnel IPv6 traffic.
- The verification section incorrectly said `curl -6 https://ifconfig.co` should return the VPN server IPv6 address and that traceroute should show the server address first. It now refers to the VPN exit IPv6 address and VPN path, which is what these tests actually verify.
- The IPv6 kill-switch example could block the VPN control channel and placed OpenVPN alternatives after a catch-all DROP. It now uses interface/port variables, permits the VPN endpoint, and allows only the necessary ICMPv6 neighbor/router solicitation traffic before dropping other IPv6 output.
- The NetworkManager WireGuard command used a static `ipv6.routes "::/0"` setting. It now uses NetworkManager's WireGuard peer-route/default-route handling and notes that the peer AllowedIPs must include `::/0`.
- The test script compared the observed IPv6 address to the VPN server address. It now compares against an expected VPN exit IPv6 address.

## Review Notes
- The post still uses `ip6tables`, which remains valid, but nftables/firewalld may be preferred on newer Linux distributions.
- The kill-switch example assumes UDP transport; OpenVPN TCP users should adjust the protocol and port variables.
- OpenVPN's `redirect-gateway ipv6` routes IPv6 Internet/global unicast traffic through the tunnel via `2000::/4` and `3000::/4`, not link-local or ULA traffic.
