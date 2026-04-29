# Validation Summary: How to Configure IPv6 Prefix Delegation on MikroTik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MikroTik RouterOS (6.x and 7.x)
- IPv6 (addressing, routing, firewall)
- DHCPv6 server / IPv6 pools
- IPv6 Neighbor Discovery / Router Advertisements (SLAAC)
- ICMPv6
- MikroTik CLI commands and Winbox GUI
- MikroTik `/tool torch` for traffic monitoring

## Sources Consulted
- [MikroTik RouterOS — IPv6 Neighbor Discovery](https://help.mikrotik.com/docs/spaces/ROS/pages/40992815/IPv6+Neighbor+Discovery)
- [MikroTik RouterOS — Torch tool](https://help.mikrotik.com/docs/spaces/ROS/pages/8323150/Torch)
- [MikroTik RouterOS — DNS](https://help.mikrotik.com/docs/spaces/ROS/pages/37748767/DNS)
- [MikroTik RouterOS — IPv4 and IPv6 Fundamentals](https://help.mikrotik.com/docs/spaces/ROS/pages/119144661/IPv4+and+IPv6+Fundamentals)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation, `2001:db8::/32`)

## Issues Found
1. **Invalid IPv6 placeholder addresses.** The post used non-hexadecimal characters in placeholder IPv6 addresses (`2001:db8:wan::254`, `2001:db8:remote::/48`, `2001:db8:lan::/64`). Letters such as `w`, `n`, `l`, `r`, `m`, `t` are not valid hex digits, so RouterOS would reject these literally. Replaced with valid hex placeholders inside the documentation prefix `2001:db8::/32`: `2001:db8:1::254`, `2001:db8:2::/48`, and `2001:db8:abcd::/64`.
2. **Incorrect parameter on `/ipv6 nd add`.** The command used `dns=2001:4860:4860::8888`, but RouterOS does not have a `dns` parameter on `/ipv6 nd`. The correct parameter is `dns-servers` (alongside `advertise-dns=yes`). Updated accordingly. Also removed the run of multiple spaces between parameters which is awkward in CLI examples.
3. **Incorrect torch IPv6 filter.** The command used `ip-protocol=ipv6`, but `ip-protocol` is for filtering by transport/IP protocol number (tcp, udp, icmp, etc.), not for selecting IPv6 traffic. Per MikroTik docs, IPv6 traffic should be matched using `src-address6=::/0` (with `ip-protocol=any`). Updated to `/tool torch interface=ether1 src-address6=::/0 ip-protocol=any`.

## Review Notes
- The post's title and tags reference "Prefix Delegation" / "DHCPv6-PD," but the content does not actually demonstrate the DHCPv6 prefix-delegation client (`/ipv6 dhcp-client add request=prefix pool-name=...`), which is the central operation of DHCPv6-PD. The content is more of a general IPv6 quick-start. This is a scope/content mismatch rather than a technical inaccuracy in the commands shown, so it was left alone per instructions to only fix technical errors and not restructure the post.
- The conclusion phrasing "How to Configure IPv6 Prefix Delegation on MikroTik on MikroTik RouterOS uses the `/ipv6` command tree" is awkward (duplicates "on MikroTik") but is a stylistic issue, not technical, so it was left as-is.
- For RouterOS 7.x, the `/ipv6 package` was merged into the main package and `/system package enable ipv6` is no longer needed (and the command may not exist on RouterOS 7). The instructions are explicitly framed as "RouterOS 6.x" so this remains accurate as written.
- `ICMPv6` should not just be allowed on the `input` chain — RFC 4890 recommends specific `icmpv6` types be permitted; allowing all `icmpv6` is acceptable for an introductory tutorial.
- The DHCPv6 server example uses `interface=bridge` and an `address-pool`, which performs stateful address assignment (M-flag). For SLAAC alone, the DHCPv6 server is not strictly required — the post mixes models but each individual command is syntactically valid.
