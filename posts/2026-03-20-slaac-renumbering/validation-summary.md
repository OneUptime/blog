# Validation Summary: How to Renumber an IPv6 Network Using SLAAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- IPv6 Neighbor Discovery Router Advertisements and Prefix Information Options
- `radvd` router advertisement configuration
- Cisco IOS IPv6 Neighbor Discovery configuration
- Linux `ip`, `ss`, and `watch` commands
- DNS, Dynamic DNS, and DHCPv6 FQDN updates

## Sources Consulted
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 6724, Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 4192, Procedures for Renumbering an IPv6 Network without a Flag Day: https://datatracker.ietf.org/doc/html/rfc4192
- RFC 9096, Improving the Reaction of Customer Edge Routers to IPv6 Renumbering Events: https://www.rfc-editor.org/rfc/rfc9096
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 2136, Dynamic Updates in the Domain Name System (DNS UPDATE): https://datatracker.ietf.org/doc/html/rfc2136
- RFC 4704, DHCPv6 Client FQDN Option: https://datatracker.ietf.org/doc/html/rfc4704
- `radvd.conf(5)` man page: https://www.mankier.com/5/radvd.conf
- Cisco IOS `ipv6 nd prefix` command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Cisco IOS `show ipv6 interface` command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-xe-3se-3850-cr-book/ipv6-xe-3se-3850-cr-book_chapter_011.html
- Local command help for `ip -6 addr`, `ss --help`, and `watch --help`

## Issues Found
1. **Invalid IPv6 example prefixes**: The overview used `2001:db8:old::/64` and `2001:db8:new::/64`, but `old` and `new` are not hexadecimal IPv6 hextets. Replaced them with valid documentation prefixes `2001:db8:a::/64` and `2001:db8:b::/64`.
2. **Root-owned config write commands would fail for normal users**: The `cat > /etc/radvd.conf` examples rely on a root shell because shell redirection is not covered by the later `sudo systemctl` command. Replaced them with `sudo tee /etc/radvd.conf > /dev/null << 'EOF'`.
3. **Prefix withdrawal semantics were oversimplified**: The post implied that removing the old prefix from later RAs immediately removes it from hosts. RFC 4861 says receivers must not act on the absence of an option in one RA, and RFC 4862 ties invalidation to valid lifetime expiry. Updated Phase 3 to advertise zero lifetimes before removing the old prefix and clarified that the timer runs from the last old-prefix RA.
4. **Cisco IOS command syntax issues**: The Cisco `no ipv6 nd prefix` example included lifetime arguments even though the documented no-form removes by prefix/default. Removed the extra arguments, replaced the non-CLI arrow annotation with a Cisco comment line, added zero-lifetime withdrawal advertisement, and changed verification to the documented `show ipv6 interface ... prefix` form.
5. **Existing connection migration claim was incorrect**: Existing TCP connections do not normally migrate to the new IPv6 source address. Changed the monitoring comment to track old-address connections until they close.
6. **DNS references and CNAME guidance were inaccurate**: The post cited RFC 4703 for dynamic DNS, but DNS UPDATE is RFC 2136 and DHCPv6 FQDN behavior is RFC 4704. Updated the reference and clarified that CNAME-based naming still requires updating the canonical AAAA records.

## Review Notes
- The corrected procedure assumes a planned renumbering with an overlap period where both old and new prefixes are usable. If an ISP immediately stops routing the old prefix, existing sessions can still break even if hosts retain the old address.
- RFC 9096 updates RFC 7084 for customer edge router behavior during renumbering events; the post's RFC 7084 tag is broadly relevant, but RFC 9096 is the more specific current reference for CE-router stale-prefix signaling.
- `radvd` was not installed in the local environment, so the `radvd.conf` examples were validated against the current man page and RFC behavior rather than by running `radvd`'s parser locally.
