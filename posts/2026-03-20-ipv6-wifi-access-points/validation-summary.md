# Validation Summary: How to Configure IPv6 on Wi-Fi Access Points

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Wi-Fi access points
- Router Advertisements (RA)
- SLAAC
- DHCPv6
- Neighbor Discovery Protocol (NDP)
- OpenWrt
- Linux networking and `ip6tables`

## Sources Consulted
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862.txt
- OpenWrt IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt Bridged AP over Ethernet / Dumb AP guidance: https://openwrt.org/docs/guide-user/network/wifi/wifiextenders/bridgedap
- OpenWrt `odhcpd` technical reference: https://openwrt.org/docs/techref/odhcpd
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Local CLI help/output checked for command syntax: `ip -6 neigh help`, `ip6tables -h`, `ip6tables -m conntrack -h`

## Issues Found
- The post described bridged APs as needing special RA forwarding. I corrected this to reflect RFC/OpenWrt behavior: a normal L2 bridge transparently passes RA, DHCPv6, and NDP, while relay/proxy features are for routed cases.
- Several example IPv6 addresses were syntactically invalid because they used non-hexadecimal host parts such as `::ap1` and `::client1`. I replaced them with valid documentation-prefix examples.
- The OpenWrt section used inaccurate AP guidance, including `network.lan.ipv6=1`, `ip6assign=64` for an AP bridge, and restarting `odhcp6c`. I replaced this with official bridged-AP host-only IPv6 config, disabled local RA/DHCPv6/NDP on a bridge, and added a separate routed relay example using `ra`/`dhcpv6`/`ndp` relay plus `master 1`.
- The lease-verification section claimed SLAAC addresses would appear in DHCP lease files and pointed to an incorrect odhcpd lease source. I changed this to `ubus call dhcp ipv6leases` for odhcpd and clarified that SLAAC addresses are not recorded in DHCP lease files.
- The “RA Proxy” section was technically wrong for bridged APs and conflated RA handling with NDP proxying. I corrected it to NDP proxy guidance for routed APs without prefix delegation and noted that client configuration still requires RA/DHCPv6 relay or a downstream RA server.
- The firewall persistence example used `sudo ip6tables-save > ...`, which would fail because shell redirection would not run under `sudo`. I corrected it to `sudo sh -c 'ip6tables-save > /etc/ip6tables/rules.v6'`.
- The end-to-end verification section implied prefix delegation should be checked on any AP. I corrected this to verify delegated prefixes on the upstream router or routing AP, using `ifstatus wan6` for OpenWrt.

## Review Notes
- The `ip6tables` examples are still valid on current Linux systems, but many modern distributions implement them through the nftables backend.
- On bridged APs, firewall rules on the AP only see bridged IPv6 traffic when bridge netfilter is in use; otherwise the bridge normally passes that traffic transparently.
- `https://ipv6.google.com` was checked live on 2026-04-29 and responded successfully over IPv6.
