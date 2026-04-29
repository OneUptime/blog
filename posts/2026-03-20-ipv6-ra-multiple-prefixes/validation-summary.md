# Validation Summary: How to Configure IPv6 RA with Multiple Prefixes

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 Neighbor Discovery / Router Advertisements
- `radvd`
- SLAAC
- Linux `iproute2`
- Cisco IOS IPv6 Neighbor Discovery

## Sources Consulted
- `radvd.conf(5)` man page: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4191, Default Router Preferences and More-Specific Routes: https://datatracker.ietf.org/doc/html/rfc4191
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc6724
- RFC 8028, First-Hop Router Selection by Hosts in a Multi-Prefix Network: https://datatracker.ietf.org/doc/html/rfc8028
- Cisco IOS IPv6 Command Reference, `ipv6 nd prefix`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Local `iproute2` CLI help: `ip -6 route help` and `ip -6 address help`

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:isp1:1::/64` and `2001:db8:new:1::/64`. I replaced them with valid documentation prefixes under `2001:db8::/32`.
- The `radvd` examples set `AdvRouterAddr on` for ordinary prefix advertisements. `AdvRouterAddr` is a Mobile IPv6 option, so I removed it from the standard SLAAC examples.
- The route-information section claimed Route Information Options tell clients which gateway to use for return traffic. I rewrote the explanation to describe RFC 4191 routes correctly and clarified that upstream/source-based routing still has to be correct.
- The route example advertised provider prefixes that did not match the explanation well. I changed them to remote destination prefixes reachable via each uplink.
- The renumbering example used `DeprecatePrefix on` as if it deprecated the prefix during normal operation. In `radvd`, `DeprecatePrefix` applies on shutdown, so I removed it.
- The renumbering example said `AdvValidLifetime 3600` makes the old prefix valid for only one more hour. RFC 4862 causes hosts to treat short valid lifetimes on existing prefixes specially, so I changed the example to `7200` and updated the comments.
- The client verification output implied a fixed set of Linux address flags and identical interface identifiers across prefixes. I replaced it with a safer example and noted that the exact flags and address count vary by OS and privacy settings.
- The conclusion overstated what route information options can guarantee. I corrected it to point at correct upstream routing and optional route information or router preferences.

## Review Notes
- The Linux commands `ip -6 addr show scope global` and `ip -6 route get ...` are valid, but their exact output varies by distro, kernel, and privacy-address configuration.
- Cisco IOS automatically advertises interface prefixes by default; the explicit `ipv6 nd prefix` commands are still valid when you want to control advertised lifetimes.
- RFC 8028 is especially relevant in true multi-router, multi-prefix networks because first-hop router selection interacts with source address selection.
