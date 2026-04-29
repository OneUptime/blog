# Validation Summary: How to Configure IPv6 Addresses on MikroTik

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MikroTik RouterOS (6.x and 7.x)
- IPv6 addressing (static, EUI-64, SLAAC)
- IPv6 routing
- IPv6 firewall filter
- DHCPv6 server and IPv6 pools
- IPv6 Neighbor Discovery / Router Advertisements
- MikroTik `/tool torch` traffic monitoring
- Winbox / WebFig GUI navigation

## Sources Consulted
- [MikroTik Docs — IPv6 Address](https://help.mikrotik.com/docs/spaces/ROS/pages/119144485/Address)
- [MikroTik Docs — IPv6 Route](https://help.mikrotik.com/docs/spaces/ROS/pages/24805377/IPv6+Route)
- [MikroTik Docs — IPv6 ND (Router Advertisements)](https://help.mikrotik.com/docs/spaces/ROS/pages/120324133/Neighbor+Discovery)
- [MikroTik Docs — DHCPv6 Server](https://help.mikrotik.com/docs/spaces/ROS/pages/24805389/DHCPv6+Server)
- [MikroTik Docs — Torch](https://help.mikrotik.com/docs/spaces/ROS/pages/8323150/Torch)
- [MikroTik Docs — Packages (RouterOS 7)](https://help.mikrotik.com/docs/spaces/ROS/pages/40992872/Packages)
- [MikroTik Docs — IPv4 and IPv6 Fundamentals](https://help.mikrotik.com/docs/spaces/ROS/pages/119144661/IPv4+and+IPv6+Fundamentals)
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)

## Issues Found
1. **Invalid IPv6 addresses containing non-hex characters.** The post used placeholder labels like `2001:db8:wan::254`, `2001:db8:remote::/48`, and `2001:db8:lan::/64`. The letters `w`, `n`, `r`, `m`, `o`, `t`, `l` are not valid hexadecimal digits, so RouterOS would reject these as malformed addresses. Replaced with valid documentation-prefix addresses (`2001:db8:1::254`, `2001:db8:2::/48`, `2001:db8:1::/64`). The documentation prefix `2001:db8::/32` (RFC 3849) is preserved.
2. **Incorrect `/tool torch` filter for IPv6.** `ip-protocol=ipv6` is not a valid value — the `ip-protocol` parameter in torch accepts IP-layer protocol values (tcp, udp, icmp, icmpv6, any, etc.), not address-family selectors. The documented way to filter torch for IPv6 traffic is via the `src-address6` / `dst-address6` parameters introduced in v5RC6. Replaced with `src-address6=::/0`, which matches all IPv6 source addresses.

## Review Notes
- The note `Check if IPv6 package is installed (RouterOS 6.x)` is technically accurate but slightly misleading — on RouterOS 7.x the IPv6 package is also separate (since v7.13 it must be installed as an extra package), so `/system package print` and `/system package enable ipv6` are still relevant on v7. Left as-is since the command itself is correct.
- The Winbox GUI path "IP → IPv6 Addresses" reflects older paths in some RouterOS builds. Modern Winbox (and recent v6/v7) presents the IPv6 menu as a top-level **IPv6** entry (e.g., **IPv6 → Addresses**, **IPv6 → Routes**, **IPv6 → Firewall**, **IPv6 → ND**). The post already mentions the top-level **IPv6 → Firewall** alternative for firewall, so the existing text is acceptable.
- The "Drop everything else" rule on `chain=input` is correct for hardening, but real deployments should ensure DHCPv6 and link-local ICMPv6 multicast traffic still pass — this is implicitly covered by the ICMPv6 accept rule but operators should be aware. Not a technical error, just a deployment caveat.
- The `ipv6=yes` flag on `/system package enable ipv6` does not exist in this article — the command shown is correct.
