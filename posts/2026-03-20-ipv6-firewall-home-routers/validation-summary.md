# Validation Summary: How to Configure IPv6 Firewall on Home Routers - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- ICMPv6
- DHCPv6
- Netfilter / `ip6tables`
- `nftables`
- OpenWrt `fw4`
- OpenWrt UCI firewall configuration

## Sources Consulted
- OpenWrt Firewall overview: https://openwrt.org/docs/guide-user/firewall/overview
- OpenWrt Netfilter Management: https://openwrt.org/docs/guide-user/firewall/netfilter_iptables/netfilter_management
- OpenWrt Firewall configuration `/etc/config/firewall`: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt 22.03 release notes: https://openwrt.org/releases/22.03/notes-22.03.0
- OpenWrt IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt IPv6 firewall examples: https://openwrt.org/docs/guide-user/firewall/fw3_configurations/fw3_ipv6_examples
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- `ip6tables(8)` man page: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions(8)` man page: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local CLI help checks: `nc -h`, `curl --help all`, `ping -h`

## Issues Found
- The OpenWrt section mixed modern OpenWrt guidance with direct `ip6tables` rule injection. I updated it to reflect OpenWrt 22.03+ using `fw4`/`nftables`, and changed the inspection commands to `fw4 print` and `nft list ruleset`. This aligns with current OpenWrt documentation.
- The example IPv6 addresses `2001:db8:home:1::server` were invalid because IPv6 text notation uses hexadecimal hextets. I replaced them with valid documentation addresses such as `2001:db8:42::1337`, which is consistent with RFC 4291 and RFC 3849.
- The ICMPv6 section previously ended with a blanket `DROP` for all other WAN ICMPv6 and the conclusion said to always permit all ICMPv6. I corrected the guidance to emphasize permitting the required control and error traffic without claiming that all ICMPv6 should always be allowed.
- The OpenWrt UCI verification step checked `ip6tables`, which does not match current `fw4`/`nftables`-based OpenWrt. I changed it to verify via `nft list ruleset`.
- The manual `nftables` example allowed any UDP traffic to destination port 546. I tightened the DHCPv6 example to `udp sport 547 udp dport 546`, matching the client/server port roles defined in RFC 8415.
- The test section used invalid IPv6 addresses and `ping6`. I replaced the addresses with valid documentation addresses, switched to `ping -6`, and made the `rdisc6` example use a real interface name with a replacement note.

## Review Notes
- The post is now accurate for modern OpenWrt releases that use `fw4` with `nftables`. Older `fw3`/iptables-based OpenWrt releases differ.
- The manual `nftables` example still uses a simple allow-ICMPv6 policy, which is reasonable for a home-router example. More restrictive ICMPv6 filtering is possible, but should follow RFC 4890 carefully to avoid breaking IPv6.
