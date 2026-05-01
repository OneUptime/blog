# Validation Summary: How to Fix Fragmentation Issues in VPN Tunnels (GRE, IPsec)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking / `iproute2`
- GRE
- IPsec ESP / XFRM / strongSwan
- WireGuard
- VXLAN
- `iptables` / TCPMSS
- Path MTU Discovery / MSS clamping

## Sources Consulted
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 2890, Key and Sequence Number Extensions to GRE: https://www.rfc-editor.org/rfc/rfc2890
- RFC 4303, IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 4106, AES-GCM for ESP: https://www.rfc-editor.org/rfc/rfc4106
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348.html
- WireGuard protocol reference: https://www.wireguard.com/protocol/
- `wg-quick(8)` manual: https://www.man7.org/linux/man-pages/man8/wg-quick.8.html
- NetworkManager `nm-settings-nmcli` reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- strongSwan route-based VPN documentation: https://docs.strongswan.org/docs/5.9/features/routeBasedVpn.html
- strongSwan forwarding / MTU-MSS documentation: https://docs.strongswan.org/docs/latest/howtos/forwarding.html
- `iptables-extensions(8)` TCPMSS reference: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help for syntax verification: `ip tunnel help`, `iptables -j TCPMSS -h`, `iptables -m policy -h`, `ping -h`, `ss --help`, `nstat --help`

## Issues Found
- The GRE overhead block understated how GRE options affect header size. I corrected it to the 4-byte base GRE header with additional 4-byte checksum/key/sequence extensions, and updated the resulting minimum MTU math.
- The IPsec AES-GCM overhead block used a 16-byte IV and an overstated total overhead. I corrected it to the RFC-defined 8-byte explicit IV, 16-byte GCM tag, 54-57 byte IPv4 tunnel-mode overhead, and noted the extra 8 bytes added by NAT-T.
- The WireGuard section treated overhead as universally 80 bytes. I corrected it to 60 bytes on IPv4 underlay and 80 bytes on IPv6 underlay, updated the PPPoE example and calculator, and noted that `wg-quick` auto-detects MTU if `MTU` is omitted.
- The NetworkManager GRE example used `ip.mtu`, which is not the documented tunnel MTU property. I corrected it to `ip-tunnel.mtu`.
- The general TCPMSS example used a misleading `POSTROUTING -o eth0` pattern for “traffic coming from the VPN”. I corrected the examples to clamp on the tunnel egress interface in `FORWARD`, which matches the documented TCPMSS use case for forwarded tunnel traffic.
- The verification example claimed `ping -M do -s 1400` should succeed on a 1420-byte path. For IPv4 ICMP that becomes a 1428-byte packet, so I corrected the example to `-s 1392` and made the retransmission check use the concrete `TcpRetransSegs` counter.

## Review Notes
- The post is technically sound after the corrections above.
- MTU recommendations in VPN setups remain environment-specific: outer IP version, GRE options, NAT-T, cipher choice, and non-1500 underlays all change the usable tunnel MTU.
- The `iptables-save > /etc/iptables/rules.v4` persistence example is now explicitly scoped to Debian/Ubuntu-style `iptables-persistent` setups.
