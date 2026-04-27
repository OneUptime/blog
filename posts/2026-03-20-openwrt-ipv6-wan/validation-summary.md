# Validation Summary: How to Configure IPv6 WAN Interface on OpenWrt

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenWrt (21.02+ / 22.03+)
- UCI (Unified Configuration Interface)
- IPv6 (DHCPv6, SLAAC, prefix delegation)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server / RA daemon)
- dnsmasq (DNS resolver)
- fw4 / nftables (IPv6 firewall)
- iproute2 (`ip -6` commands)
- BusyBox (`logread`, `ping6`)

## Sources Consulted
- OpenWrt network configuration documentation: https://openwrt.org/docs/guide-user/base-system/basic-networking
- OpenWrt /etc/config/network reference: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt DHCP/odhcpd configuration: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt firewall configuration (fw4): https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt UCI documentation: https://openwrt.org/docs/guide-user/base-system/uci
- OpenWrt IPv6 prefix delegation: https://openwrt.org/docs/guide-user/network/ipv6/ipv6.essentials

## Issues Found
No technical issues found.

All UCI options for the `wan6` interface (`proto=dhcpv6`, `reqaddress=try`, `reqprefix=auto`) are valid and current. The odhcpd configuration values (`dhcpv6=server`, `ra=server`, `ra_management=1`, `ip6assign=60`) match official documentation. The firewall rule using `proto=icmp` with `family=ipv6` and `icmp_type` matches the pattern used in OpenWrt's default `Allow-ICMPv6-Input` rule. Diagnostic commands (`logread | grep odhcp6c`, `ip -6 addr/route/neigh show`, `ping6`) are accurate for OpenWrt's BusyBox-based environment.

## Review Notes
- The firewall rule example uses `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'` (a space-separated string). While this legacy format is accepted by OpenWrt's firewall parser, the more idiomatic modern approach is to use `uci add_list firewall.@rule[-1].icmp_type='echo-request'` repeatedly to build a proper list. Both work, so this was not flagged as an error.
- The post correctly notes fw4/nftables as the default in OpenWrt 22.03+; readers on older 21.02 installations would still be using fw3/iptables, which the prerequisites already acknowledge.
- The default `ip6assign` of `60` allocates a /60 from the delegated prefix to the LAN — this is correct and matches OpenWrt defaults.
- `ping6` is available via BusyBox on OpenWrt; modern Linux distros may prefer `ping -6`, but `ping6` remains valid on OpenWrt itself.
