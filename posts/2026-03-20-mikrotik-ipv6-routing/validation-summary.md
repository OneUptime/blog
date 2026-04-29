# Validation Summary: How to Configure IPv6 Routing on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS (6.x and 7.x)
- IPv6 (addressing, routing, firewall, DHCPv6, Neighbor Discovery / SLAAC)
- Winbox GUI
- `/tool torch` traffic monitoring

## Sources Consulted
- MikroTik Documentation — Torch: https://help.mikrotik.com/docs/spaces/ROS/pages/8323150/Torch
- MikroTik Documentation — IPv6 Neighbor Discovery: https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery
- MikroTik Documentation — IP Pools: https://help.mikrotik.com/docs/spaces/ROS/pages/129531938/IP+Pools
- MikroTik Wiki — Manual:IPv6/Pool: https://wiki.mikrotik.com/wiki/Manual:IPv6/Pool
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation)

## Issues Found

1. **Invalid IPv6 addresses using non-hex characters.** The post used placeholders such as `2001:db8:wan::254`, `2001:db8:remote::/48`, and `2001:db8:lan::/64`. IPv6 hextets only accept hex digits (0–9, a–f); letters w, l, n, r, m, t are not valid and would be rejected by RouterOS. Replaced with valid documentation-prefix variants: `2001:db8:1::254`, `2001:db8:2::/48`, and `2001:db8:3::/64`.

2. **Torch filter parameter wrong for IPv6.** The post used `/tool torch interface=ether1 ip-protocol=ipv6`. The `ip-protocol` parameter filters Layer-4 protocols within IP (tcp, udp, icmp, etc.), not the IP version. To filter by IP version (EtherType), the correct parameter is `mac-protocol=ipv6`. Updated accordingly.

3. **Wrong parameter name for ND DNS list.** The post used `dns=2001:4860:4860::8888` in the `/ipv6 nd add` command. The correct property name in RouterOS is `dns-servers`. Updated to `dns-servers=2001:4860:4860::8888`.

4. **Missing `prefix-length` on `/ipv6 pool add`.** RouterOS requires `prefix-length` when creating an IPv6 pool. Added `prefix-length=64` to the pool example.

## Review Notes
- The conclusion contains a stylistic redundancy ("How to Configure IPv6 Routing on MikroTik on MikroTik RouterOS"), but this is wording, not a technical error, and was left intact per scope.
- On RouterOS 7.x, IPv6 functionality is bundled into the main package rather than shipped as a separate `ipv6` package; the `/system package enable ipv6` step is a 6.x-only concern. The post does scope that step correctly with the "(RouterOS 6.x)" comment.
- The default `/ipv6 nd` entry (`interface=all`) already exists; adding a per-interface entry as shown is supported, but readers configuring a single bridge could alternatively `set` the default entry instead.
- For DHCPv6 prefix delegation use cases, readers may want a parent prefix larger than `/64` (e.g., `/56` or `/60`) with `prefix-length=64` so multiple `/64`s can be delegated; the example shown is appropriate for a single-subnet stateful pool.
