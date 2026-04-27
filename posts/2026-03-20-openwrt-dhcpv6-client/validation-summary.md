# Validation Summary: How to Configure DHCPv6 Client on OpenWrt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenWrt (21.02 / 22.03+)
- UCI (Unified Configuration Interface)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server + Router Advertisement daemon)
- dnsmasq
- fw4 / nftables (and legacy fw3 / iptables)
- IPv6, DHCPv6, ICMPv6, SLAAC, prefix delegation
- BusyBox `ip` / `ping6` / `logread`

## Sources Consulted
- OpenWrt firewall configuration: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt 22.03.0 release notes (fw4 default): https://openwrt.org/releases/22.03/notes-22.03.0
- OpenWrt network configuration (ip6assign defaults): https://openwrt.org/docs/guide-user/network/network_configuration
- OpenWrt IPv6 configuration guide: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt DHCP/odhcpd configuration (ra_management semantics): https://openwrt.org/docs/guide-user/base-system/dhcp

## Issues Found
1. **Firewall rule used `uci set` with a space-separated string for `icmp_type`.** `icmp_type` is a UCI list option, so passing `'echo-request destination-unreachable'` to `uci set` stores it as a single literal token rather than two ICMPv6 types and the rule will not match as intended. Replaced the single `uci set` with two `uci add_list` calls (one per ICMPv6 type), which is the correct way to populate UCI list options from the shell.
2. **Prerequisite line attributed fw4/nftables to OpenWrt 21.02+.** fw4 (nftables-based firewall) was introduced as the default in OpenWrt 22.03; 21.02 still ships fw3/iptables. Adjusted the prerequisite to read "OpenWrt 21.02+ (22.03+ for fw4/nftables IPv6 firewall)" so the IPv6/firewall version requirement matches the rest of the post (which already correctly notes "OpenWrt 22.03+" in the firewall section).

## Review Notes
- `option ip6assign '60'` matches the OpenWrt stock LAN configuration and is correct.
- `option proto 'dhcpv6'` with `reqaddress 'try'` and `reqprefix 'auto'` are the documented defaults for an upstream DHCPv6 client.
- `option ra_management '1'` (M+A flags, hybrid SLAAC + stateful DHCPv6) is valid; note that newer odhcpd builds prefer the more granular `ra_flags` / `ra_slaac` options, and `ra_management` is treated as a legacy compatibility alias.
- `ping6` is provided by BusyBox on OpenWrt and works, but `ping -6` is the more portable invocation on modern Linux distributions if readers run these commands off-router.
- The `/etc/init.d/network restart` advice is correct; `reload` is often sufficient and less disruptive when only re-applying UCI changes, but `restart` is not wrong.
