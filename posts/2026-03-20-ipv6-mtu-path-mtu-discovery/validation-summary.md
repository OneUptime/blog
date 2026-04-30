# Validation Summary: How to Troubleshoot IPv6 MTU and Path MTU Discovery Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Path MTU Discovery (PMTUD)
- ICMPv6
- Linux networking tools (`ip`, `ping`, `tracepath`, `traceroute`, `tcpdump`, `ip6tables`)
- OpenVPN
- WireGuard

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification — https://datatracker.ietf.org/doc/rfc8200/
- RFC 8201: Path MTU Discovery for IP version 6 — https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4443: Internet Control Message Protocol (ICMPv6) for IPv6 — https://datatracker.ietf.org/doc/html/rfc4443
- `ping(8)` — https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` — https://man7.org/linux/man-pages/man8/tracepath.8.html
- `traceroute(8)` — https://man7.org/linux/man-pages/man8/traceroute.8.html
- `pcap-filter(7)` — https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ip-route(8)` — https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- OpenVPN 2.6 Manual — https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- WireGuard `wg-quick(8)` — https://git.zx2c4.com/wireguard-tools/tree/src/man/wg-quick.8
- Local CLI help/output verified on this system for `ping -6`, `tracepath`, `ip6tables`, and `ip -6 route`

## Issues Found
- The Ethernet IPv6 TCP payload math was wrong. The post said `1460` bytes for IPv6 TCP on a 1500-byte Ethernet link, but the correct no-options MSS is `1440` bytes (`1500 - 40 - 20`). The PPPoE and 6in4 examples were updated to matching IPv6 TCP MSS values (`1432` and `1420`).
- The packet-test section mixed an IPv6 explanation with legacy command usage. The commands were updated to `ping -6`, and the comment now correctly states that IPv6 has no DF bit and that routers do not fragment packets in transit.
- The `tcpdump` filter used a fixed `ip6[40]` offset, which is brittle and can be wrong when extension headers are present. It was replaced with an ICMPv6 type-field filter using `icmp6[icmp6type] == icmp6-packettoobig`.
- The firewall rules used numeric ICMPv6 type values only. They were updated to the named `packet-too-big` form for clarity while preserving the same behavior.
- The path-MTU discovery commands were outdated for current Linux tooling. `tracepath6` and `traceroute6` were updated to `tracepath -6` and `traceroute -6 --mtu`, and the sample `tracepath` output was corrected to match the documented output format.
- The route-cache example was not appropriate for modern Linux usage. `ip -6 route show cache | grep mtu` was replaced with `ip -6 route get ...`, which is the current way to inspect the resolved route and may show a lowered PMTU.
- The OpenVPN section implied `fragment` as a generic fix. It was narrowed to OpenVPN over UDP and annotated as a last-resort workaround, which matches the current OpenVPN manual guidance.
- The WireGuard note was incorrect. `Table 0 prevents routing loops` does not reflect `wg-quick` behavior. It was replaced with the documented MTU behavior: `wg-quick` auto-discovers MTU unless `MTU` is set explicitly.
- The conclusion overstated the cause of IPv6 MTU failures as "almost always" firewall blocking. It was softened to "a common cause" and expanded to include tunnel/interface MTU verification, which is more technically accurate.

## Review Notes
- The `ip6tables` examples are still valid and were confirmed against current tooling, but on many modern Linux distributions they are implemented through the nftables backend.
- `tracepath` and `traceroute` are not guaranteed to be installed by default on every distribution, so command availability can vary even when the syntax is correct.
