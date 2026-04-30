# Validation Summary: How to Configure IPv6 on OpenWrt Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenWrt
- IPv6
- DHCPv6
- Prefix Delegation (PD)
- odhcp6c
- odhcpd
- firewall4 / nftables
- UCI

## Sources Consulted
- OpenWrt IPv6 configuration documentation: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt DHCP and DNS configuration documentation: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt default network generation source: https://raw.githubusercontent.com/openwrt/openwrt/master/package/base-files/files/bin/config_generate
- OpenWrt DHCPv6 protocol handler source: https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/ipv6/odhcp6c/files/dhcpv6.sh
- OpenWrt odhcpd defaults source: https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/services/odhcpd/files/odhcpd.defaults
- odhcpd upstream README: https://raw.githubusercontent.com/openwrt/odhcpd/master/README.md
- OpenWrt firewall4 package definition: https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/config/firewall4/Makefile
- OpenWrt firewall4 default firewall config: https://raw.githubusercontent.com/openwrt/firewall4/master/root/etc/config/firewall
- OpenWrt fw4 command source: https://raw.githubusercontent.com/openwrt/firewall4/master/root/sbin/fw4

## Issues Found
- The post used `ifname` for network interfaces. Current OpenWrt examples and generated configs use `device`, so I updated the UCI commands and `/etc/config/network` snippets accordingly.
- The PPPoE example enabled IPv6 on `wan` but did not move `wan6` onto the PPP interface. I changed the example to use `network.wan6.device='@wan'` and added `ifup wan` and `ifup wan6`.
- The LAN setup omitted `network.lan.ip6assign`, which is required for assigning a downstream prefix from the ISP-delegated prefix. I added `ip6assign '60'` to both the UCI example and the direct config example.
- The LAN example configured RA only. I added `dhcpv6 'server'` so the guide matches OpenWrt’s normal RA + DHCPv6 client-serving setup.
- The firewall section referred to `ip6tables`, but current OpenWrt uses `firewall4`, an nftables-based firewall. I updated the verification command to `fw4 print`.
- The verification section relied on older interface and ping commands and an outdated state-file check. I replaced those with `ubus call network.interface.* status` and `ping -6`.

## Review Notes
- The guide assumes the ISP delegates a usable routed prefix. If an ISP only provides a single `/64` with no downstream delegation, normal LAN prefix delegation will not work and relay or proxy-based approaches are needed instead.
- The example WAN-to-LAN IPv6 firewall rule allows TCP/443 forwarding to any LAN host that already has a reachable global IPv6 address. In practice, adding `dest_ip` is usually safer when exposing only one host.
