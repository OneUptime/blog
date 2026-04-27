# Validation Summary: How to Configure IPv6 with Multiple Upstream Prefixes on OpenWrt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenWrt (21.02+, 22.03+)
- UCI (Unified Configuration Interface)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server + Router Advertisement daemon)
- dnsmasq
- fw4 / nftables (and fw3 / iptables, by reference)
- IPv6 (DHCPv6, prefix delegation, RA, ICMPv6, NDP)

## Sources Consulted
- OpenWrt firewall configuration: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt DHCP/odhcpd configuration: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt UCI documentation: https://openwrt.org/docs/guide-user/base-system/uci
- OpenWrt 22.03 release notes (fw4/nftables default)

## Issues Found
1. **Prerequisite stated wrong OpenWrt version for fw4/nftables.** The original text said "OpenWrt 21.02+ (for improved IPv6 support with fw4/nftables)". fw4/nftables became the default firewall starting with OpenWrt 22.03; 21.02 still uses fw3/iptables. Updated to "OpenWrt 22.03+ (for fw4/nftables; earlier releases use fw3/iptables)" which is also consistent with the post's own later note in the firewall section.

2. **Deprecated `ra_management` option.** The DHCP/RA snippet used `option ra_management '1'`, which is officially deprecated in odhcpd in favor of `ra_flags` and `ra_slaac`. Replaced with the modern equivalent: `list ra_flags 'managed-config'` plus `list ra_flags 'other-config'` (semantically equivalent to the legacy `ra_management '2'` managed+other-config behavior, which matches typical stateful DHCPv6 deployments).

3. **Non-idiomatic `uci set` for list option `icmp_type`.** The original used a single `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'`. Per OpenWrt docs, `icmp_type` is a list option and the canonical way to populate it is with `uci add_list`. Replaced with two `uci add_list` calls so the rule is built correctly and portably.

## Review Notes
- The post's title promises coverage of "Multiple Upstream Prefixes" / multihoming, but the body content is a generic OpenWrt IPv6 setup guide and does not actually demonstrate multi-prefix or multi-WAN configuration. This is a scope/content issue rather than a technical inaccuracy, so per the review guidelines (no restructuring) it was left as-is, but it is worth flagging for an editorial pass in the future.
- `ping6` is still typically present as a busybox applet in OpenWrt builds, but on modern Linux/busybox the future-proof form is `ping -6 <addr>`. The current usage is acceptable.
- `uci show network | grep ipv6` will only surface settings whose key string contains "ipv6"; some IPv6-related keys use `ip6` (e.g., `ip6assign`, `ip6class`) and may not appear. Functional but incomplete; not a correctness issue.
- The DNS list entry uses a single Google Public DNS server (`2001:4860:4860::8888`); production setups typically include the secondary (`2001:4860:4860::8844`). Stylistic, not incorrect.
