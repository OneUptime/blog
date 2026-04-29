# Validation Summary: How to Monitor IPv6 Traffic on MikroTik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MikroTik RouterOS (6.40+ and 7.x)
- IPv6 addressing (static, EUI-64, SLAAC)
- IPv6 routing
- IPv6 firewall filtering
- DHCPv6 server
- Neighbor Discovery / Router Advertisements
- Torch (real-time traffic monitor)
- MikroTik connection tracking
- ICMPv6
- SNMP / IPv6 MIB (referenced)

## Sources Consulted
- MikroTik official documentation - IPv6 Overview: https://help.mikrotik.com/docs/display/ROS/IPv6+Overview
- MikroTik documentation - Addresses: https://help.mikrotik.com/docs/display/ROS/Addresses
- MikroTik documentation - Routes: https://help.mikrotik.com/docs/display/ROS/Routes
- MikroTik documentation - Firewall and QoS (IPv6): https://help.mikrotik.com/docs/display/ROS/Firewall
- MikroTik documentation - DHCPv6 Server: https://help.mikrotik.com/docs/display/ROS/DHCPv6+Server
- MikroTik documentation - Neighbor Discovery: https://help.mikrotik.com/docs/display/ROS/Neighbor+discovery
- MikroTik wiki / docs - Tool Torch: https://wiki.mikrotik.com/wiki/Manual:Tool/Torch
- MikroTik documentation - Packages (RouterOS 6.x ipv6 package): https://help.mikrotik.com/docs/display/ROS/Packages
- IANA Protocol Numbers (protocol 41 = IPv6 encapsulation): https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 8106 (IPv6 Router Advertisement Options for DNS Configuration)

## Issues Found

1. **Incorrect Torch parameter for monitoring native IPv6 traffic.** The post used `/tool torch interface=ether1 ip-protocol=ipv6`. In MikroTik Torch, `ip-protocol` refers to the L4/transport IP protocol number. The value `ipv6` corresponds to IP protocol number 41, which is IPv6-in-IPv4 encapsulation (6in4 tunneling), not native IPv6 traffic. Changed the command to `/tool torch interface=ether1 src-address6=::/0`, which causes Torch to enter IPv6-mode and display native IPv6 flows (using `src-address6=` / `dst-address6=` filters is the documented way to monitor IPv6 traffic in Torch).

2. **Incorrect path for connection tracking.** The post used `/ipv6 firewall connection print`. MikroTik RouterOS keeps a unified connection-tracking table under `/ip firewall connection` which contains both IPv4 and IPv6 entries; there is no `connection` subcommand under `/ipv6 firewall`. Changed to `/ip firewall connection print` and added a brief note that the table is shared between IPv4 and IPv6.

## Review Notes
- The `/system package enable ipv6` and `/system package print` commands are specific to RouterOS 6.x where IPv6 ships as a separate optional package. In RouterOS 7.x, IPv6 is part of the main system bundle and there is no separate package to enable. The post correctly comments this section as RouterOS 6.x.
- The IPv6 firewall ruleset is a minimal "allow established + ICMPv6 + drop" example. In production, additional rules (allow loopback, accept DHCPv6 on link-local, rate-limit ICMPv6 types per RFC 4890) would be advisable, but the example is technically correct for an introductory tutorial.
- The conclusion paragraph contains an awkward phrasing ("How to Monitor IPv6 Traffic on MikroTik on MikroTik RouterOS") but this is stylistic, not technical, so it was left unchanged per the review guidelines.
- The post's title and "Monitoring with OneUptime" section reference SNMP and Graphing as stated topics, but the body focuses primarily on configuration with only a brief monitoring section. The technical content that is present is accurate after the two fixes above.
