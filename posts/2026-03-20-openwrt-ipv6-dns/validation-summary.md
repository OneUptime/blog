# Validation Summary: How to Configure IPv6 DNS on OpenWrt

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
- dnsmasq (DNS resolver / AAAA records)
- fw4 / nftables
- fw3 / iptables (ip6tables)
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
- OpenWrt dnsmasq DHCP/DNS docs: https://openwrt.org/docs/guide-user/base-system/dhcp_configuration

## Issues Found
1. **Incorrect version requirement for fw4/nftables**: The Prerequisites section claimed "OpenWrt 21.02+ (for improved IPv6 support with fw4/nftables)". This is inaccurate — fw4 (nftables-based firewall) was introduced in OpenWrt 22.03. OpenWrt 21.02 still uses fw3 with iptables. Updated to "OpenWrt 22.03+ (for fw4/nftables) or earlier versions with fw3/iptables".

2. **Incorrect UCI syntax for `icmp_type`**: The IPv6 Firewall Rules section used `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'`. In OpenWrt's firewall UCI schema, `icmp_type` is a **list option**, not a single string option. Setting it as a space-separated string via `uci set` would produce a single option, not the expected list of values. Replaced with two separate `uci add_list` commands — one per icmp type — which matches the documented `list icmp_type 'value'` syntax used by OpenWrt's firewall configuration.

## Review Notes
- The post title is "How to Configure IPv6 DNS on OpenWrt", but the content covers very little dnsmasq/DNS configuration directly — most of the post is general IPv6 setup (WAN6, LAN prefix delegation, DHCPv6 server, RA, ICMPv6 firewall). Only the `list dns '2001:4860:4860::8888'` line in `/etc/config/dhcp` directly relates to advertising IPv6 DNS to LAN clients. The post does not show dnsmasq upstream-server configuration for IPv6 (e.g., `/etc/config/dhcp` `config dnsmasq` `list server` entries) or related options like `noresolv`, `filter_aaaa`, or `localservice`. This is a scope/coverage gap rather than a technical inaccuracy, so no content was added per the review guidelines (only fix technical errors, do not add new sections).
- The `option ra_management '1'` (Managed mode) is correct: it sets the M-flag in RAs so clients use stateful DHCPv6 for addresses.
- The `option ip6assign '60'` on the LAN interface is correct — assigns a /60 from the delegated prefix.
- The `list dns '2001:4860:4860::8888'` correctly advertises Google Public DNS over IPv6 to clients (via DHCPv6 / RDNSS depending on `ra_management`).
- `ping6` is a legacy command alias; on modern Linux it's preferred to use `ping -6` or just `ping`. However, BusyBox on OpenWrt still ships `ping6` as a working command, so the example remains valid in the OpenWrt context.
- The firewall ICMPv6 rule example does not specify `src` (zone), so it applies without a source-zone constraint. In real configurations users typically add `option src 'wan'` for inbound ICMPv6 from WAN. The example as shown is syntactically valid UCI and serves as a starting template.
- The `option device 'eth0'` for the WAN6 interface is valid but device-specific; modern OpenWrt with DSA may use names like `wan` or `eth1`. Users will adapt to their hardware.
