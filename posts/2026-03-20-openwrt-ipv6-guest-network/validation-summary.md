# Validation Summary: How to Configure IPv6 Guest Network on OpenWrt

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered

- OpenWrt (21.02+, 22.03+ for fw4)
- UCI (Unified Configuration Interface)
- IPv6 (DHCPv6, SLAAC, RA)
- odhcp6c (DHCPv6 client)
- odhcpd (DHCPv6 server / RA daemon)
- dnsmasq
- fw4 / nftables / iptables (firewall)
- Linux `ip` and `ping6` utilities

## Sources Consulted

- OpenWrt DHCP configuration: https://openwrt.org/docs/guide-user/base-system/dhcp_configuration
- OpenWrt firewall configuration: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt UCI documentation: https://openwrt.org/docs/guide-user/base-system/uci
- OpenWrt firewall4 source (ucode templates) for verifying `proto 'icmp'` + `family 'ipv6'` mapping to ICMPv6
- BusyBox documentation for `ping`/`ping6` applets

## Issues Found

1. **`icmp_type` UCI list option set as a single space-separated string.** The original snippet used:

   ```
   uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'
   ```

   In OpenWrt's firewall config, `icmp_type` is a list-type option (`list icmp_type 'value'`). Using `uci set` with a space-separated string stores it as a single string option, not as multiple list entries, and the firewall would treat it as one (invalid) ICMP type rather than two. Replaced with the canonical `uci add_list` form so each ICMP type is a separate list entry:

   ```
   uci add_list firewall.@rule[-1].icmp_type='echo-request'
   uci add_list firewall.@rule[-1].icmp_type='destination-unreachable'
   ```

## Review Notes

- The post's title mentions a "Guest Network" but the content is a generic IPv6-on-OpenWrt walkthrough — there is no separate guest SSID, no isolated guest interface/zone, and no per-interface `ip6assign` / `ip6hint` for a guest prefix. This is a scope/title mismatch but not a technical error in the code shown, so per the review brief (no restructuring or new sections) it has been left alone.
- `proto 'icmp'` together with `family 'ipv6'` is correctly translated to ICMPv6 (protocol 58) by both fw3 and fw4, so this is technically valid even though `proto 'icmpv6'` would be more explicit.
- `ra_management '1'` is the OpenWrt default (managed config, M=1/O=1) and is consistent with `dhcpv6 'server'`. Newer OpenWrt versions also support `ra_flags` as a list-style alternative; `ra_management` still works.
- `ping6` continues to ship as a BusyBox applet on OpenWrt, but on recent BusyBox builds `ping -6 ...` is the more portable form.
- `option ip6assign '60'` delegates a /60 from the WAN-delegated prefix to LAN; this is only meaningful if the ISP delegates a prefix shorter than or equal to /60. If a smaller prefix (e.g. /64) is delegated, this value would need to be adjusted (e.g. to `64`).
