# Validation Summary: How to Set MTU Size for an IPv4 Network Interface on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux network interfaces
- iproute2 `ip link`
- iputils `ping` and `tracepath`
- Netplan
- NetworkManager `nmcli`
- Debian ifupdown `/etc/network/interfaces`
- Ethernet, IPv4 MTU, jumbo frames, PPPoE, WireGuard, and VXLAN

## Sources Consulted
- ip-link(8) Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iputils ping(8) manual page: https://dokk.org/manpages/debian/13/iputils-ping/ping.8.en
- iputils tracepath(8) manual page: https://manpages.debian.org/unstable/iputils-tracepath/tracepath.8.en.html
- Netplan YAML configuration reference: https://canonical-netplan.readthedocs-hosted.com/en/latest/netplan-yaml/
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Debian interfaces(5) manual page: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- RFC 894, IP Datagrams over Ethernet Networks: https://datatracker.ietf.org/doc/html/rfc894
- RFC 1191, Path MTU Discovery: https://datatracker.ietf.org/doc/html/rfc1191
- RFC 2516, PPP over Ethernet: https://www.rfc-editor.org/rfc/rfc2516
- RFC 7348, VXLAN: https://datatracker.ietf.org/doc/html/rfc7348
- WireGuard wg-quick(8) manual page: https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8

## Issues Found
- The introduction described MTU only as the Ethernet frame payload size. I clarified that on Ethernet interfaces the MTU is the maximum Layer 3 packet carried in the frame payload, and for IPv4 this is the IP datagram size.
- The post said an oversized MTU causes fragmentation or silent loss. I changed this to "can cause" fragmentation, Path MTU Discovery failures, or dropped frames because the exact failure mode depends on DF handling, ICMP delivery, and the Layer 2 or routed path.
- The jumbo-frame warning implied every device on any path must support the same MTU. I narrowed this to the NIC, switch port, and Layer 2 hops for jumbo frames, and noted that routed paths are limited by the smallest link MTU.
- The ping troubleshooting text treated a failed 1472-byte payload ping as definitive proof of a sub-1500 path MTU. I updated it to say this is likely when smaller probes succeed, and allowed for large DF ICMP probes being dropped.

## Review Notes
The commands and configuration snippets are syntactically valid for the documented tools. Users still need to replace example interface names, NetworkManager connection names, and addresses with values from their own systems.
