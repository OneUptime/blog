# Validation Summary: How to Configure DHCPv6 Client on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS (6.40+ and 7.x)
- IPv6 addressing, routing, and firewall
- DHCPv6 (server commands shown)
- IPv6 Neighbor Discovery / Router Advertisements
- MikroTik `/tool torch` traffic monitoring

## Sources Consulted
- MikroTik Help Center — IPv6 Address: https://help.mikrotik.com/docs/spaces/ROS/pages/328226/IPv6+Address
- MikroTik Help Center — IPv6 Route: https://help.mikrotik.com/docs/spaces/ROS/pages/328228/IPv6+Route
- MikroTik Help Center — IPv6 Firewall: https://help.mikrotik.com/docs/spaces/ROS/pages/328231/IPv6+Firewall
- MikroTik Help Center — IPv6 DHCP Server: https://help.mikrotik.com/docs/spaces/ROS/pages/328230/IPv6+DHCP+Server
- MikroTik Help Center — IPv6 Neighbor Discovery: https://help.mikrotik.com/docs/spaces/ROS/pages/328225/IPv6+Neighbor+Discovery
- MikroTik Help Center — Tool Torch: https://help.mikrotik.com/docs/spaces/ROS/pages/8978489/Torch
- RFC 4291 (IPv6 Addressing Architecture) for valid hex-only address syntax
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) for `2001:db8::/32` usage

## Issues Found
1. **Invalid hex characters in IPv6 placeholder addresses.** The post used `2001:db8:wan::254`, `2001:db8:remote::/48`, and `2001:db8:lan::/64`. The letters `w`, `n`, `r`, `m`, `t`, `l` are not valid hexadecimal digits, so RouterOS would reject these literally as malformed IPv6 addresses. Replaced with valid documentation-prefix hextets: `2001:db8:1::254`, `2001:db8:2::/48`, and `2001:db8:3::/64`.
2. **Incorrect `/tool torch` parameter.** The command used `ip-protocol=ipv6`, but `ip-protocol` filters by transport protocol (tcp, udp, icmp, etc.), not by L3 version. To filter for IPv6 traffic the correct EtherType filter is `mac-protocol=ipv6`. Updated accordingly.
3. **Missing `prefix-length` on `/ipv6 pool add`.** Added `prefix-length=64` to make the pool definition explicit and consistent with RouterOS syntax expectations for the DHCPv6 pool example.

## Review Notes
- The post is titled "How to Configure DHCPv6 Client on MikroTik" but the body covers a generic IPv6 configuration template (addresses, routes, firewall, DHCPv6 *server*, ND) and does not actually demonstrate the `/ipv6 dhcp-client add ...` command that would configure a DHCPv6 client. This is a content scope mismatch with the title; per validation instructions ("do not add new sections, restructure the post, or make stylistic changes"), no new content was added. Future revisions should add an explicit DHCPv6 client section, e.g. `/ipv6 dhcp-client add interface=ether1 request=address,prefix add-default-route=yes pool-name=ipv6-pool pool-prefix-length=60`.
- The conclusion contains the awkward duplicated phrase "How to Configure DHCPv6 Client on MikroTik on MikroTik RouterOS"; left as-is since this is stylistic, not technical.
- Notes on accuracy of unchanged content: the IPv6 package reminder applies only to RouterOS 6.x (in 7.x, IPv6 is a built-in protocol with no separate package) — the post correctly scopes that note. ICMPv6 must be permitted through the firewall (RFC 4890); the post correctly emphasizes this.
- The Winbox menu paths (`IP → IPv6 Addresses`, `IP → Firewall → IPv6`) reflect older RouterOS 6.x layouts; in RouterOS 7.x the IPv6 menu is at the top level (`IPv6 → Addresses`, etc.). The post acknowledges both with the parenthetical alternative.
