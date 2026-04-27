# Validation Summary: How to Troubleshoot IPv6 on OpenWrt

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- OpenWrt (21.02+, 22.03+)
- IPv6 (DHCPv6, SLAAC, Router Advertisements, Prefix Delegation)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server / RA daemon)
- dnsmasq (DNS resolver)
- UCI (Unified Configuration Interface)
- fw4 / nftables (firewall)
- BusyBox utilities (logread, ping6, ip)
- ICMPv6

## Sources Consulted
- OpenWrt Wiki — Network configuration: https://openwrt.org/docs/guide-user/base-system/basic-networking
- OpenWrt Wiki — IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt Wiki — odhcpd documentation: https://openwrt.org/docs/guide-user/network/ipv6/start
- OpenWrt Wiki — UCI system / `/etc/config/network`: https://openwrt.org/docs/guide-user/base-system/uci
- OpenWrt Wiki — `/etc/config/dhcp`: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt Wiki — Firewall configuration (fw4): https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- RFC 4861 (Neighbor Discovery for IPv6) and RFC 8415 (DHCPv6) for protocol behavior

## Issues Found
No technical issues found.

All UCI options (`proto='dhcpv6'`, `reqaddress='try'`, `reqprefix='auto'`, `ip6assign '60'`, `dhcpv6 'server'`, `ra 'server'`, `ra_management '1'`) are valid for the OpenWrt versions stated. The firewall rule syntax with `proto='icmp'` and `family='ipv6'` correctly targets ICMPv6 in both fw3 and fw4. Diagnostic commands (`ip -6 addr show`, `ip -6 route show`, `ip -6 neigh show`, `logread | grep odhcp6c/odhcpd`, `ping6`) are all valid on OpenWrt's BusyBox-based system.

## Review Notes
- The `icmp_type` option in `/etc/config/firewall` is documented as a list option. The post sets it via `uci set ...icmp_type='echo-request destination-unreachable'` (space-separated string). Both fw3 and fw4 parsers accept space-separated values for list options, so this works in practice, though the more idiomatic form is `uci add_list firewall.@rule[-1].icmp_type='echo-request'` (one per call). Functionally correct as written.
- `ra_management '1'` corresponds to the OpenWrt default (O-flag set, M-flag unset — stateless DHCPv6 alongside SLAAC). This is appropriate for typical home/office IPv6 deployments.
- `ping6` is still present in OpenWrt's BusyBox; on most modern desktop Linux distributions it has been replaced by `ping -6`, but the blog's audience is OpenWrt users so `ping6` is the correct choice here.
- The post mentions iptables as an alternative IPv6 firewall — this is accurate for OpenWrt 21.02 and earlier (fw3); fw4/nftables became the default in 22.03.
