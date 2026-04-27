# Validation Summary: How to Enable IPv6 on OpenWrt

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenWrt (21.02+, 22.03+)
- UCI (Unified Configuration Interface)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server + Router Advertisement daemon)
- dnsmasq (DNS resolver)
- fw4 / nftables (firewall)
- fw3 / iptables (legacy firewall)
- IPv6 / DHCPv6 / SLAAC / ICMPv6 / NDP

## Sources Consulted
- OpenWrt IPv6 configuration guide: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt 22.03.0 release notes (fw4 introduction): https://openwrt.org/releases/22.03/notes-22.03.0
- OpenWrt DHCP/odhcpd reference: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt odhcpd techref: https://openwrt.org/docs/techref/odhcpd
- OpenWrt firewall configuration: https://openwrt.org/docs/guide-user/firewall/firewall_configuration

## Issues Found
1. **Incorrect OpenWrt version for fw4/nftables.** The Prerequisites listed "OpenWrt 21.02+ (for improved IPv6 support with fw4/nftables)". fw4/nftables was introduced as the default firewall in OpenWrt **22.03**, not 21.02 (which still uses fw3/iptables). Updated the line to "OpenWrt 22.03+ (for fw4/nftables-based IPv6 firewall); 21.02+ also works with fw3/iptables".
2. **Deprecated `ra_management` option.** The DHCP config used `option ra_management '1'`, which is deprecated per the official odhcpd docs in favor of `ra_flags` (and `ra_slaac`). Replaced with the modern equivalent: `list ra_flags 'managed-config'` and `list ra_flags 'other-config'`, which produces equivalent M+O flag behavior.
3. **Incorrect `icmp_type` UCI syntax.** The firewall rule used `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'` (a single space-separated string). Per the official firewall_configuration documentation, `icmp_type` is a multi-value list option that should be set with multiple `list` entries. Changed to two `uci add_list` calls — one per ICMP type.

## Review Notes
- `option proto 'icmp'` combined with `option family 'ipv6'` is the correct way to match ICMPv6 in OpenWrt firewall config (there is no `icmpv6` proto keyword in fw3/fw4).
- For a real-world IPv6 firewall on the WAN side, more ICMPv6 types should typically be allowed (e.g., `echo-reply`, `packet-too-big`, `time-exceeded`, `bad-header`, `router-solicitation`, `neighbour-solicitation`, `neighbour-advertisement`). The post only shows two for illustration; readers should consult the OpenWrt default ICMPv6 rule for production deployments.
- `uci show network | grep ipv6` will not match interface names like `wan6` (no "ipv6" substring), so its usefulness is limited; it does catch `proto='dhcpv6'` etc. only because of the substring "v6" if grepping case-insensitively — actually `dhcpv6` does not contain `ipv6`, so this command is somewhat less useful than implied. Functional and not technically wrong, so left as-is.
- BusyBox on OpenWrt provides both `ping6` and `ping -6`, so the connectivity test command works as written.
- `option ip6assign '60'` is the correct documented syntax for delegating a /60 prefix from the WAN6 prefix delegation to the LAN interface.
