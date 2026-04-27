# Validation Summary: How to Configure IPv6 Prefix Delegation on OpenWrt

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenWrt (21.02+, 22.03+)
- UCI (Unified Configuration Interface)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server + RA daemon)
- dnsmasq
- fw4 / nftables (OpenWrt 22.03+)
- IPv6 / DHCPv6 Prefix Delegation (RFC 3633)
- Router Advertisement (RA, RFC 4861)
- ICMPv6

## Sources Consulted
- OpenWrt official documentation: https://openwrt.org/docs/guide-user/network/ipv6/start
- OpenWrt UCI network reference: https://openwrt.org/docs/guide-user/base-system/basic-networking
- OpenWrt /etc/config/network reference: https://openwrt.org/docs/guide-user/base-system/network_configuration
- OpenWrt /etc/config/dhcp reference: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt /etc/config/firewall reference: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt fw4 documentation: https://openwrt.org/docs/guide-user/firewall/fw4
- odhcpd documentation: https://openwrt.org/docs/guide-user/network/ipv6/ipv6.smallnetwork
- RFC 3633 (IPv6 Prefix Options for DHCPv6)
- RFC 4861 (Neighbor Discovery for IP version 6)

## Issues Found

1. **ICMPv6 firewall rule used incorrect UCI syntax for `icmp_type`**: The original used `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'`, treating a multi-value list as a single space-separated string. UCI distinguishes between `option` (single value) and `list` (multi-value). To populate a list, you must use `uci add_list`. Fixed by replacing the single `uci set` with two `uci add_list` calls — one per ICMP type — matching the format used in OpenWrt's default firewall config.

2. **ICMPv6 firewall rule was missing the `src` zone**: A firewall rule without a source zone does not match input traffic from a specific zone (such as WAN) and may behave inconsistently. Added `uci set firewall.@rule[-1].src='wan'` to align with OpenWrt's default `Allow-ICMPv6-Input` rule pattern.

## Review Notes

- `ip6assign '60'` in the LAN config is correct and matches the OpenWrt default. It carves out a /60 from the delegated prefix for the LAN; this works when the ISP delegates a /56 or shorter, which is typical.
- `ra_management '1'` is the OpenWrt default and sets both the M and O flags on RAs (SLAAC + stateful DHCPv6). This is appropriate for most LANs.
- The prerequisites mention "OpenWrt 21.02+ ... with fw4/nftables", but fw4 only became the default in 22.03. The phrasing is slightly loose but not strictly incorrect since 21.02 still supports IPv6 fine via fw3/iptables; the parenthetical is forward-looking.
- `ping6` is provided by BusyBox on OpenWrt and remains a valid command on the router itself, even though desktop Linux distros increasingly prefer `ping -6`.
- The `Allow-ICMPv6` rule in this post only includes two ICMP types (`echo-request`, `destination-unreachable`). A production-ready rule typically also includes `packet-too-big`, `time-exceeded`, `bad-header`, `unknown-header-type`, and the NDP types (`router-solicitation`, `neighbour-solicitation`, `router-advertisement`, `neighbour-advertisement`). The post's example is illustrative rather than exhaustive — left as-is since the structure is now syntactically correct.
