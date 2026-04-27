# Validation Summary: How to Configure IPv6 Firewall on OpenWrt

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenWrt (router firmware)
- UCI (Unified Configuration Interface)
- IPv6
- DHCPv6 (odhcp6c client, odhcpd server)
- Router Advertisements (RA)
- fw4 / nftables
- fw3 / iptables (ip6tables)
- dnsmasq
- ICMPv6
- Linux iproute2 (`ip -6`)

## Sources Consulted
- OpenWrt Firewall configuration docs: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt 22.03 release notes (fw4 introduction): https://openwrt.org/releases/22.03/notes-22.03.0
- OpenWrt Network configuration docs: https://openwrt.org/docs/guide-user/base-system/basic-networking
- OpenWrt DHCP configuration docs: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt IPv6 / WAN6 docs: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt UCI documentation: https://openwrt.org/docs/guide-user/base-system/uci
- odhcpd documentation: https://openwrt.org/docs/guide-user/network/ipv6/ipv6.essentials

## Issues Found
1. **Incorrect version requirement for fw4/nftables**: The Prerequisites section claimed "OpenWrt 21.02+ (for improved IPv6 support with fw4/nftables)". This is inaccurate — fw4 (nftables-based firewall) was introduced in OpenWrt 22.03. OpenWrt 21.02 still uses fw3 with iptables. Updated to "OpenWrt 22.03+ (for fw4/nftables) or earlier versions with fw3/iptables".

2. **Incorrect UCI syntax for `icmp_type`**: The IPv6 Firewall Rules section used `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'`. In OpenWrt's firewall UCI schema, `icmp_type` is a **list option**, not a single string. Setting it as a space-separated string would not produce the expected list entries. Replaced with two separate `uci add_list` commands — one per icmp type — which matches the documented `list icmp_type 'value'` syntax used by OpenWrt's firewall configuration.

## Review Notes
- The `option ra_management '1'` (Managed mode) setting is correct for stateful DHCPv6 + RA combinations; this corresponds to setting the M-flag in RAs.
- The `option ip6assign '60'` for the LAN interface is correct — this assigns a /60 subnet from the delegated prefix (typical for residential ISP /56 or /60 delegations).
- `ping6` is a legacy command alias; on modern Linux it's preferred to use `ping -6` or just `ping`. However, BusyBox on OpenWrt still ships `ping6` as a working command, so the example remains valid in the OpenWrt context.
- The firewall rule example does not specify `src` (zone), which means the rule applies without a source-zone constraint. In real configurations, users typically add `option src 'wan'` for inbound ICMPv6 from WAN — but the example as shown is syntactically valid UCI and serves as a starting template.
- The post title is "How to Configure IPv6 Firewall on OpenWrt" but the content covers more than just firewall rules (network/DHCP/RA setup). This is acceptable scope-wise as IPv6 firewall configuration is interdependent with these other components on OpenWrt.
